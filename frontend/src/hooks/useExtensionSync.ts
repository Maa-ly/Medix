import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useAccount, useReconnect } from "wagmi";
import {
  SessionData,
  sendSessionToExtension,
  listenForExtensionSession,
  requestSessionFromExtension,
  getSessionFromStorage,
  getSessionFromChromeStorage,
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
  const { reconnect } = useReconnect();
  const {
    isConnected,
    authMethod,
    setConnected,
    setAuthMethod,
    setWalletAddress,
    setAddress,
    setConnecting,
  } = useAppStore();

  // Apply session data to app state
  const applySession = useCallback(
    (sessionData: SessionData) => {
      if (sessionData.isConnected) {
        console.log("[useExtensionSync] Applying session data:", sessionData);
        setConnected(true);
        setAuthMethod(sessionData.authMethod);

        // Use address from session data, not from wagmi (which might not be connected yet in extension)
        const addr = sessionData.currentAccount?.address || (sessionData as any)?.walletAddress || null;
        if (addr) {
          setWalletAddress(addr);
          setAddress(addr);
        }
      }
    },
    [setConnected, setAuthMethod, setWalletAddress, setAddress]
  );

  // Sync wagmi connection state with store
  useEffect(() => {
    if (isExtension()) return;
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

    // Use wagmi connection state as source of truth
    const sessionData: SessionData = {
      isConnected: wagmiIsConnected,  // Use wagmi state, not store state
      authMethod: wagmiIsConnected ? (authMethod || "walletconnect") : authMethod,
      currentAccount: address ? { address, network: "lisk-sepolia" } : null,
      timestamp: Date.now(),
    };

    // Only send if there's meaningful data
    if (wagmiIsConnected && address) {
      console.log("[useExtensionSync] Syncing session to extension:", sessionData);
      sendSessionToExtension(sessionData);
    }
  }, [wagmiIsConnected, authMethod, address]);

  // On initial load, try to get session from extension or storage
  useEffect(() => {
    // For extension: load from chrome.storage and listen for updates
    if (isExtension()) {
      console.log("[useExtensionSync] Running in extension mode");

      // Load initial session
      const loadSession = async () => {
        setConnecting(true);
        try {
          const sessionData = await (async () => {
            const fromChrome = await getSessionFromChromeStorage();
            if (fromChrome) return fromChrome;
            return getSessionFromStorage();
          })();
          console.log("[useExtensionSync] Loaded session from storage:", sessionData);

          if (sessionData && sessionData.isConnected) {
            console.log("[useExtensionSync] Found connected session, applying...");

            // Apply session data immediately to show UI
            applySession(sessionData);

            // Try to reconnect wagmi in background (may fail in extension context)
            try {
              await reconnect();
              console.log("[useExtensionSync] Wagmi reconnected successfully");
            } catch (reconnectError) {
              console.log("[useExtensionSync] Wagmi reconnect failed (expected in extension):", reconnectError);
              // Don't clear session - wagmi reconnect may not work in extension popup
              // The session data is still valid and UI should show connected state
            }
          } else {
            console.log("[useExtensionSync] No connected session found");
          }
        } catch (error) {
          console.error("[useExtensionSync] Error loading session:", error);
        } finally {
          setConnecting(false);
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

    // For web app: also set loading state while checking for session
    setConnecting(true);

    // Check localStorage first
    const storedSession = getSessionFromStorage();
    if (storedSession && storedSession.isConnected && !isConnected) {
      console.log("[useExtensionSync] Loading session from localStorage");
      applySession(storedSession);
    }

    // Also request from extension in case it has newer data
    requestSessionFromExtension();

    // Set timeout to stop loading if no session found
    const loadingTimeout = setTimeout(() => {
      setConnecting(false);
    }, 2000); // Give 2 seconds to check for session

    // Listen for session from extension
    const cleanup = listenForExtensionSession((sessionData) => {
      if (sessionData.isConnected && !isConnected) {
        applySession(sessionData);
        setConnecting(false); // Ensure loading state is turned off
        clearTimeout(loadingTimeout); // Clear timeout if session is found
      }
    });

    return () => {
      cleanup();
      clearTimeout(loadingTimeout);
    };
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
