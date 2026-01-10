import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LogOut, Copy, Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { LogoIcon, WalletImageIcon } from "./AppIcons";

// Check if running as extension
const isExtension = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

export function Header() {
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();
  const { addToast, logout } = useAppStore();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleConnect = async () => {
    // In extension, open modal in the current window
    if (isExtension) {
      await open({ view: "Connect" });
    } else {
      await open();
    }
  };

  const handleLogout = () => {
    disconnect();
    logout();
    navigate("/");
    addToast({
      type: "success",
      message: "Disconnected successfully",
      duration: 3000,
    });
  };

  const copyWalletAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 glass-dark border-b border-dark-700/50"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <LogoIcon />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-coral bg-clip-text text-transparent">
              Medix
            </span>
          </div>

          <div className="flex items-center gap-4">

            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-coral text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <WalletImageIcon size={20} inverted={false} />
                {isExtension ? "Connect" : "Connect Wallet"}
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all backdrop-blur-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-coral flex items-center justify-center text-white text-sm font-bold">
                    {address ? address.slice(2, 4).toUpperCase() : "M"}
                  </div>
                  <div className="text-sm font-mono text-white hidden sm:block">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      showDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showDropdown && (
                  <div 
                    className="absolute right-0 mt-2 w-64 glass-dark rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-dark-700/50">
                      <div className="text-sm text-gray-400 mb-1">
                        Wallet Address
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white font-mono text-sm">
                          {address ? formatAddress(address) : ""}
                        </span>
                        <button
                          onClick={copyWalletAddress}
                          className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        >
                          {copiedWallet ? (
                            <Check size={16} className="text-green-400" />
                          ) : (
                            <Copy size={16} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        navigate("/profile");
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                    >
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                    >
                      Settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-600/20 transition-colors flex items-center gap-2 border-t border-dark-700/50"
                    >
                      <LogOut size={16} />
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
