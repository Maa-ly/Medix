import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  Copy,
  Check,
  Award,
  Calendar,
  ExternalLink,
  Edit3,
  Book,
  Film,
  Tv,
  Play,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAccount } from "wagmi";
import { uploadProfileImage, getUserProfile } from "@/services/backend";
const statIcons = {
  book: Book,
  movie: Film,
  anime: Play,
  manga: BookOpen,
  tvshow: Tv,
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const {
    isConnected,
    authMethod,
    backendUser,
    joinedAt,
    completions,
    setBackendUser,
    updateBackendUserImage,
    addToast,
    logout,
  } = useAppStore();

  const [copied, setCopied] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch backend user if not already loaded
  // Refetch user profile on mount to get latest data (including profile image)
  // Use ref to prevent multiple fetches
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const fetchBackendUser = async () => {
      if (!isConnected || hasFetchedRef.current) return;

      try {
        let authId: string | null = null;
        
        // For WalletConnect, use the wallet address as authId
        if (address) {
          authId = address;
        }

        if (authId && authMethod) {
          hasFetchedRef.current = true;
          console.log(
            `[ProfilePage] Fetching backend user for ${authMethod}:`,
            authId
          );
          const user = await getUserProfile(authMethod, authId);
          if (user) {
            console.log("[ProfilePage] Backend user fetched:", user.id);
            setBackendUser(user);
          } else {
            console.warn("[ProfilePage] Backend user not found for:", authId);
          }
        }
      } catch (error) {
        console.error("[ProfilePage] Error fetching backend user:", error);
        hasFetchedRef.current = false; // Reset on error
      }
    };

    // Always refetch on mount to get latest profile data
    fetchBackendUser();
  }, [isConnected, authMethod, address, backendUser, setBackendUser, addToast]);

  // Load saved profile image from localStorage on mount (fallback if no backend image)
  useEffect(() => {
    // First check if we have a backend user with profile image
    if (backendUser?.profileImage) {
      setLocalProfileImage(backendUser.profileImage);
      return;
    }

    // Fallback to localStorage
    const storageKey = address
        ? `profileImage_${address}`
        : null;

    if (storageKey) {
      const savedImage = localStorage.getItem(storageKey);
      if (savedImage) {
        setLocalProfileImage(savedImage);
      }
    }
  }, [
    authMethod,
    address,
    backendUser?.profileImage,
  ]);

  // Get display name based on auth method
  const displayName = backendUser?.profileName || "Lisk User";

  // Get profile ID for display
  const profileId = address
      ? `${address.slice(0, 8)}...${address.slice(
          -6
        )}`
      : null;

  // Format join date
  const formatJoinDate = (dateString: string | null) => {
    if (!dateString) return "Recently joined";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };


  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle profile image upload
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("[ProfilePage] Upload started, backendUser:", backendUser);

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      addToast({
        type: "error",
        message: "Please select an image file (JPEG, PNG, WebP, or GIF)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: "error",
        message: "Image size must be less than 5MB",
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // First show local preview immediately for better UX
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        setLocalProfileImage(base64Image);
      };
      reader.readAsDataURL(file);

      // Upload to backend if we have a backend user ID
      if (backendUser?.id) {
        console.log(
          "[ProfilePage] Uploading to backend for user:",
          backendUser.id
        );
        try {
          const result = await uploadProfileImage(backendUser.id, file);
          console.log("[ProfilePage] Upload result:", result);
          if (result.imageUrl) {
            // Update the backend user image in store
            updateBackendUserImage(result.imageUrl);
            setLocalProfileImage(result.imageUrl);
            addToast({
              type: "success",
              message: "Profile image uploaded successfully!",
            });
          }
        } catch (backendError) {
          console.error("[ProfilePage] Backend upload error:", backendError);
          // Fallback to localStorage if backend fails
          const storageKey = address
              ? `profileImage_${address}`
              : null;

          if (storageKey) {
            const base64 = await new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onloadend = () => resolve(r.result as string);
              r.readAsDataURL(file);
            });
            localStorage.setItem(storageKey, base64);
          }
          addToast({
            type: "warning",
            message: "Image saved locally (backend unavailable)",
          });
        }
      } else {
        // No backend user, save to localStorage only
        console.warn(
          "[ProfilePage] No backend user found! Saving to localStorage only."
        );
        console.log("[ProfilePage] Auth method:", authMethod);
        console.log("[ProfilePage] Current account:", address);

        const storageKey = address
            ? `profileImage_${address}`
            : null;

        if (storageKey) {
          const base64 = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.readAsDataURL(file);
          });
          localStorage.setItem(storageKey, base64);
        }
        addToast({
          type: "warning",
          message: "Profile image saved locally (please reconnect to upload)",
        });
      }
    } catch (error) {
      console.error("Image upload error:", error);
      addToast({
        type: "error",
        message: "Failed to upload image. Please try again.",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Trigger file input click
  const handleEditImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogout = async () => {
    try {
      logout();
      addToast({ type: "info", message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Calculate stats
  const typeStats = completions.reduce((acc, nft) => {
    acc[nft.media.type] = (acc[nft.media.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!isConnected) {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center flex-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-coral/20 to-violet/20 flex items-center justify-center border border-coral/30"
            animate={{
              boxShadow: [
                "0 0 20px rgba(168, 85, 247, 0.2)",
                "0 0 40px rgba(168, 85, 247, 0.4)",
                "0 0 20px rgba(168, 85, 247, 0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <User className="w-12 h-12 text-coral" />
          </motion.div>
          <h2 className="text-2xl font-bold gradient-text mb-3">
            Your Profile
          </h2>
          <p className="text-dark-400 max-w-xs mx-auto mb-8">
            Connect your wallet to view your profile, achievements, and manage
            your account settings.
          </p>

          {/* Stats Preview */}
          <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-xs mx-auto">
            <div className="card py-4 opacity-60">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-dark-400">NFTs</p>
            </div>
            <div className="card py-4 opacity-60">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-dark-400">Groups</p>
            </div>
            <div className="card py-4 opacity-60">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-dark-400">Friends</p>
            </div>
          </div>

          <p className="text-sm text-dark-500">
            Go to the home page to connect your wallet
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-coral text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-coral to-violet p-[3px]">
            <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center overflow-hidden">
              {localProfileImage ? (
                <img
                  src={localProfileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-dark-400" />
              )}
            </div>
          </div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="hidden"
          />
          {/* Edit button */}
          <button
            onClick={handleEditImageClick}
            disabled={isUploadingImage}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-coral text-white hover:bg-coral-light transition-colors disabled:opacity-50"
          >
            {isUploadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Info */}
        <h1 className="text-xl font-bold text-white mb-1">{displayName}</h1>

        {/* Profile ID or Wallet Address */}
        {profileId && (
          <div className="flex flex-col items-center gap-1 text-sm text-dark-400 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono">{profileId}</span>
              {address && (
                <button
                  onClick={handleCopyAddress}
                  className="p-1 rounded hover:bg-dark-700 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-brand-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Network Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 text-sm">
          <div className="w-2 h-2 rounded-full bg-brand-green" />
          <span className="text-dark-300">WalletConnect</span>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Your Achievements</h2>
          <div className="flex items-center gap-1 text-coral">
            <Award className="w-4 h-4" />
            <span className="font-bold">{completions.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {(["book", "movie", "anime", "manga", "tvshow"] as const).map(
            (type) => {
              const Icon = statIcons[type];
              const count = typeStats[type] || 0;

              return (
                <div key={type} className="text-center">
                  <div
                    className={`
                  w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1
                  ${count > 0 ? "bg-coral/20" : "bg-dark-700"}
                `}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        count > 0 ? "text-coral" : "text-dark-500"
                      }`}
                    />
                  </div>
                  <p className="text-sm font-bold text-white">{count}</p>
                  <p className="text-xs text-dark-500 capitalize">{type}s</p>
                </div>
              );
            }
          )}
        </div>
      </motion.div>

      {/* Account Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="font-semibold text-white">Account</h2>

        {/* Wallet Address */}
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
            <User className="w-5 h-5 text-dark-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-dark-400">Wallet Address</p>
            <p className="text-white font-mono text-sm">{profileId}</p>
          </div>
        </div>

        {/* Provider */}
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-dark-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-dark-400">Connected via</p>
            <p className="text-white capitalize">WalletConnect</p>
          </div>
        </div>

        {/* Member Since */}
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-dark-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-dark-400">Member since</p>
            <p className="text-white">{formatJoinDate(joinedAt)}</p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h2 className="font-semibold text-white">Settings</h2>

        <button
          onClick={() => navigate("/settings")}
          className="card w-full flex items-center gap-4 hover:border-dark-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
            <Settings className="w-5 h-5 text-dark-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white">Preferences</p>
            <p className="text-sm text-dark-400">
              Tracking, notifications, custom sites
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-dark-500" />
        </button>

        <button
          onClick={handleLogout}
          className="card w-full flex items-center gap-4 border-brand-red/20 hover:border-brand-red/40 hover:bg-brand-red/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400">Disconnect Wallet</p>
            <p className="text-sm text-dark-400">Log out of your account</p>
          </div>
        </button>
      </motion.div>

      {/* Version */}
      <p className="text-center text-xs text-dark-600 pt-4">
        Medix v1.0.0 • Built for Hackathon
      </p>
    </div>
  );
}
