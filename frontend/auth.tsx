import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { Loader2 } from "lucide-react";
import { wagmiConfig } from "./src/services/walletConnect";
import { getUserProfile, createOrUpdateUser } from "./src/services/backend";
import { AppImageData } from "./src/components/AppImageData";
import "./src/index.css";

const queryClient = new QueryClient();

// Cross-browser chrome API compatibility
interface BrowserAPI {
  storage?: {
    local: {
      set: (items: Record<string, any>) => Promise<void>;
      get: (keys?: string | string[]) => Promise<Record<string, any>>;
      remove: (keys: string | string[]) => Promise<void>;
    };
  };
  runtime?: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any) => void) => void;
      removeListener: (callback: (message: any) => void) => void;
    };
  };
}

const browserAPI: BrowserAPI | undefined = typeof window !== "undefined"
  ? ((window as any).chrome || (window as any).browser)
  : undefined;

type AuthStatus = "idle" | "connecting" | "syncing" | "success" | "error";

function AuthPageContent() {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();

  const handleSuccessfulConnection = useCallback(async (walletAddress: string) => {
    try {
      setStatus("syncing");
      console.log("[AuthPage] Wallet connected, syncing to extension...");

      // Create/update user in backend
      let _backendUser;
      try {
        _backendUser = await getUserProfile("walletconnect", walletAddress);
      } catch {
        // User doesn't exist, create new one
        _backendUser = await createOrUpdateUser({
          authId: walletAddress,
          authMethod: "walletconnect",
          profileName: `User ${walletAddress.slice(0, 6)}`,
          walletAddress: walletAddress,
        });
        _backendUser = _backendUser.user;
      }

      // Store session data for extension to pickup
      const sessionData = {
        isConnected: true,
        authMethod: "walletconnect" as const,
        currentAccount: { address: walletAddress, network: "lisk-sepolia" },
        timestamp: Date.now(),
      };

      // Save to chrome.storage for extension (cross-browser compatible)
      if (browserAPI?.storage) {
        await browserAPI.storage.local.set({
          medix_session: sessionData,
          medix_last_sync: Date.now(),
        });
        console.log("[AuthPage] Session saved to browser storage");

        // Notify extension that session was updated
        if (browserAPI?.runtime) {
          try {
            browserAPI.runtime.sendMessage({
              type: "SESSION_UPDATED",
              data: sessionData,
            });
            console.log("[AuthPage] Notified extension of session update");
          } catch (error) {
            console.log("[AuthPage] Could not notify extension:", error);
          }
        }
      }

      // Also save to localStorage as fallback
      localStorage.setItem("medix_session", JSON.stringify(sessionData));

      setStatus("success");

      // Close window after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (error) {
      console.error("WalletConnect auth error:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to connect wallet. Please try again."
      );

      // Disconnect on error
      disconnect();

      // Close window after 3 seconds even on error
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }, [disconnect]);

  // Handle successful connection and sync to extension
  useEffect(() => {
    if (isConnected && address && status === "connecting") {
      handleSuccessfulConnection(address);
    }
  }, [isConnected, address, status, handleSuccessfulConnection]);

  const handleWalletConnect = async () => {
    setStatus("connecting");
    setErrorMessage("");

    try {
      // Open Web3Modal to connect wallet
      await open();
    } catch (error) {
      console.error("Connection error:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to connect wallet. Please try again."
      );

      setTimeout(() => {
        window.close();
      }, 3000);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#0f0f1e] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4"
      style={{ fontFamily: "Outfit, system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src={AppImageData.wallet}
                alt="Wallet"
                className="w-24 h-24"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Connect Wallet
            </h1>
            <p className="text-gray-400 text-sm">
              Connecting wallet for Medix Extension
            </p>
          </div>

          {/* Status Messages */}
          {status === "idle" && (
            <div className="space-y-4">
              <p className="text-center text-gray-300 text-sm mb-6">
                Click below to connect your wallet using WalletConnect. Your
                session will be securely shared with the extension.
              </p>
              <button
                onClick={handleWalletConnect}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-coral text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <img
                  src={AppImageData.wallet}
                  alt="Wallet"
                  className="w-5 h-5"
                />
                Connect Wallet
              </button>
            </div>
          )}

          {status === "connecting" && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
              <p className="text-white font-medium mb-2">
                Connecting wallet...
              </p>
              <p className="text-gray-400 text-sm">
                Please complete the connection in your wallet
              </p>
            </div>
          )}

          {status === "syncing" && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
              <p className="text-white font-medium mb-2">
                Syncing to extension...
              </p>
              <p className="text-gray-400 text-sm">
                Saving your session data
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg mb-2">
                Wallet Connected!
              </p>
              <p className="text-gray-400 text-sm">
                This window will close automatically...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg mb-2">
                Connection Failed
              </p>
              <p className="text-red-400 text-sm mb-4">{errorMessage}</p>
              <p className="text-gray-400 text-sm">
                This window will close automatically...
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-purple-500/20">
            <p className="text-center text-gray-500 text-xs">
              🔒 Your wallet is secured with WalletConnect protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthApp() {
  return (
    <React.StrictMode>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AuthPageContent />
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<AuthApp />);
export default AuthApp;
