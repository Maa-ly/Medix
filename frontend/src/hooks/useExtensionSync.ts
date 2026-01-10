import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useAccount } from "wagmi";
import {
  SessionData,
  sendSessionToExtension,
  listenForExtensionSession,
  requestSessionFromExtension,
  getSessionFromStorage,
  isExtension,
  MESSAGE_TYPES,
} from "@/services/extensionBridge";

/**
 * Hook to synchronize session between web app and extension
 *
 * When running as web app:
 * - Sends session data to extension whenever auth state changes
 * - Listens for session data from extension on initial load
 *
 * When running as extension:
 * - Loads session from chrome.storage on initial load
 * - Listens for session updates from web app
 */
export function useExtensionSync() {
  const { address, isConnected: wagmiIsConnected } = useAccount();
  const {
    isConnected,
    authMethod,
    setConnected,
    setAuthMethod,
    setWalletAddress,
    setAddress,
  } = useAppStore();

  // Apply session data to app state
  const applySession = useCallback(
    (sessionData: SessionData) => {
      if (sessionData.isConnected) {
        console.log("[useExtensionSync] Applying session data:", sessionData);
        setConnected(true);
        setAuthMethod(sessionData.authMethod);
        if (address) {
          setWalletAddress(address);
        }
      }
    },
    [setConnected, setAuthMethod, setWalletAddress, address]
  );

  // Sync wagmi connection state with store
  useEffect(() => {
    if (wagmiIsConnected && address) {
      setConnected(true);
      setAddress(address);
      if (!authMethod) {
        setAuthMethod("walletconnect");
      }
    } else if (!wagmiIsConnected) {
      setConnected(false);
      setAddress(null);
    }
  }, [wagmiIsConnected, address, authMethod, setConnected, setAddress, setAuthMethod]);

  // Sync session to extension when auth state changes (web app only)
  useEffect(() => {
    // Don't sync from extension to itself
    if (isExtension()) return;

    const sessionData: SessionData = {
      isConnected,
      authMethod,
      currentAccount: address ? { address, network: "lisk-sepolia" } : null,
      timestamp: Date.now(),
    };

    // Send session to extension
    sendSessionToExtension(sessionData);
  }, [isConnected, authMethod, address]);

  // On initial load, try to get session from extension or storage
  useEffect(() => {
    // For extension: load from chrome.storage and listen for updates
    if (isExtension()) {
      console.log("[useExtensionSync] Running in extension mode");

      // Load initial session
      const loadSession = async () => {
        const sessionData = await getSessionFromStorage();
        if (sessionData && sessionData.isConnected) {
          applySession(sessionData);
        }
      };
      loadSession();

      // Listen for session updates from background script
      const messageListener = (message: {
        type: string;
        data: SessionData;
      }) => {
        if (message.type === "SESSION_UPDATED" && message.data) {
          console.log("[useExtensionSync] Session updated from web app auth");
          applySession(message.data);
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);

      // Also listen for storage changes
      const storageListener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName === "local" && changes.medix_session?.newValue) {
          const sessionData = changes.medix_session.newValue as SessionData;
          if (sessionData.isConnected) {
            console.log("[useExtensionSync] Session changed in storage");
            applySession(sessionData);
          }
        }
      };

      chrome.storage.onChanged.addListener(storageListener);

      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
        chrome.storage.onChanged.removeListener(storageListener);
      };
    }

    // For web app: check localStorage first
    const storedSession = getSessionFromStorage();
    if (storedSession && storedSession.isConnected && !isConnected) {
      console.log("[useExtensionSync] Loading session from localStorage");
      applySession(storedSession);
    }

    // Also request from extension in case it has newer data
    requestSessionFromExtension();

    // Listen for session from extension
    const cleanup = listenForExtensionSession((sessionData) => {
      if (sessionData.isConnected && !isConnected) {
        applySession(sessionData);
      }
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Listen for extension ready signal (for web app)
  useEffect(() => {
    if (isExtension()) return;

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;

      const message = event.data;
      if (message?.type === MESSAGE_TYPES.EXTENSION_READY) {
        console.log(
          "[useExtensionSync] Extension is ready, syncing session..."
        );
        // Sync current session to extension
        if (isConnected) {
          sendSessionToExtension({
            isConnected,
            authMethod,
            currentAccount: address ? { address, network: "lisk-sepolia" } : null,
            timestamp: Date.now(),
          });
        } else {
          // Request session from extension
          requestSessionFromExtension();
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isConnected, authMethod, address]);
}

/**
 * Hook for extension to listen for session updates from web app
 * This is specifically for the content script
 */
export function useContentScriptSync() {
  useEffect(() => {
    if (!isExtension()) return;

    // Listen for session updates from chrome.storage
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.medix_session) {
        console.log("[ContentScript] Session updated in storage");
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, []);
}
