import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { getUserProfile, createOrUpdateUser } from "@/services/backend";

type AuthStatus = "idle" | "connecting" | "success" | "error";

export default function AuthPage() {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const handleSuccessfulConnection = useCallback(async (walletAddress: string) => {
    try {
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

      // Send to extension via postMessage
      window.postMessage(
        {
          type: "SESSION_SYNC",
          source: "medix-web",
          authMethod: "walletconnect",
          data: sessionData,
        },
        "*"
      );

      console.log("[AuthPage] WalletConnect session sent to extension");

      setStatus("success");
      setSuccessMessage(
        "Wallet connected successfully! Extension will update shortly..."
      );

      // Wait for extension acknowledgment
      const ackTimeout = setTimeout(() => {
        console.log("[AuthPage] Extension sync timeout, closing anyway");
        window.close();
      }, 5000);

      const handleAck = (event: MessageEvent) => {
        if (
          event.data &&
          event.data.type === "SESSION_SYNC_ACK" &&
          event.data.source === "medix-extension"
        ) {
          console.log("[AuthPage] Extension acknowledged session sync");
          clearTimeout(ackTimeout);
          window.removeEventListener("message", handleAck);
          setTimeout(() => {
            window.close();
          }, 1500);
        }
      };

      window.addEventListener("message", handleAck);
    } catch (error) {
      console.error("WalletConnect auth error:", error);

      // Disconnect to prevent stale session
      disconnect();

      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to connect wallet. Please try again."
      );

      // Close window after 3 seconds even on error
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }, [disconnect]);

  useEffect(() => {
    // Check if we have a pending auth request from the extension
    const urlParams = new URLSearchParams(window.location.search);
    const extensionId = urlParams.get("extensionId");

    if (extensionId) {
      sessionStorage.setItem("pendingExtensionId", extensionId);
    }
  }, []);

  // NOTE: Removed aggressive session cleanup on mount
  // The previous cleanup was clearing valid sessions and causing issues
  // Wagmi handles session management internally
  // Only disconnect on actual errors, not on mount

  useEffect(() => {
    if (isConnected && address && status === "connecting") {
      handleSuccessfulConnection(address);
    }
  }, [isConnected, address, status, handleSuccessfulConnection]);


  const handleWalletConnect = async () => {
    setStatus("connecting");
    setErrorMessage("");

    try {
      // Use the first available connector (WalletConnect)
      const connector = connectors[0];
      if (!connector) {
        throw new Error("No wallet connector available");
      }

      await connect({ connector });
    } catch (error) {
      console.error("Connection error:", error);

      // Disconnect to prevent stale session
      disconnect();

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-coral rounded-full flex items-center justify-center">
                <Wallet className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Connect Wallet
            </h1>
            <p className="text-gray-400 text-sm">
              Connecting wallet for Medix Extension
            </p>
          </div>

          {/* Status Messages */}
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <p className="text-center text-gray-300 text-sm mb-6">
                  Click below to connect your wallet using WalletConnect. Your session will be
                  securely shared with the extension.
                </p>
                <button
                  onClick={handleWalletConnect}
                  className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-coral text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </button>
              </motion.div>
            )}

            {status === "connecting" && (
              <motion.div
                key="connecting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-8"
              >
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium mb-2">
                  Connecting wallet...
                </p>
                <p className="text-gray-400 text-sm">
                  Please complete the connection in your wallet
                </p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                </motion.div>
                <p className="text-white font-semibold text-lg mb-2">
                  {successMessage}
                </p>
                <p className="text-gray-400 text-sm">
                  This window will close automatically...
                </p>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8"
              >
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-2">
                  Connection Failed
                </p>
                <p className="text-red-400 text-sm mb-4">{errorMessage}</p>
                <p className="text-gray-400 text-sm">
                  This window will close automatically...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-purple-500/20">
            <p className="text-center text-gray-500 text-xs">
              🔒 Your wallet is secured with WalletConnect protocol
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
