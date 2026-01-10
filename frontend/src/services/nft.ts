import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { wagmiConfig } from "./wagmi";
import { MEDIX_CONTRACT, MEDIX_ABI } from "./contract";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

export type HexAddress = `0x${string}`;

export function mapMediaKind(
  kind: number
): "book" | "movie" | "anime" | "comic" | "manga" | "tvshow" | "unknown" {
  if (kind === 1) return "book";
  if (kind === 2) return "movie";
  if (kind === 3) return "anime";
  if (kind === 4) return "comic";
  if (kind === 5) return "manga";
  if (kind === 6) return "tvshow";
  return "unknown";
}

export function mapTrackedType(type: string): number {
  if (type === "book") return 1;
  if (type === "movie") return 2;
  if (type === "anime") return 3;
  if (type === "comic") return 4;
  if (type === "manga") return 5;
  if (type === "tvshow") return 6;
  if (type === "video") return 2; // Map video to Movie type
  
  // Default to Movie for unknown types to prevent kind=0 rejection
  console.warn(`[NFT] Unknown media type "${type}", defaulting to Movie`);
  return 2;
}

export async function readUserNfts(user: HexAddress): Promise<bigint[]> {
  const ids = await readContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "getusernft",
    args: [user],
    chainId: MEDIX_CONTRACT.chainId,
  });
  return ids as unknown as bigint[];
}

export async function getTokensMetadata(tokenIds: bigint[]) {
  if (tokenIds.length === 0) return [];

  // Use Promise.all with individual readContract calls instead of multicall
  // because the current chain might not support Multicall3
  const promises = tokenIds.map(async (id) => {
    try {
      const [tokenURI, mediaId] = await Promise.all([
        readContract(wagmiConfig, {
          address: MEDIX_CONTRACT.address as HexAddress,
          abi: MEDIX_ABI,
          functionName: "tokenURI",
          args: [id],
          chainId: MEDIX_CONTRACT.chainId,
        }) as Promise<string>,
        readContract(wagmiConfig, {
          address: MEDIX_CONTRACT.address as HexAddress,
          abi: MEDIX_ABI,
          functionName: "tokenMediaId",
          args: [id],
          chainId: MEDIX_CONTRACT.chainId,
        }) as Promise<`0x${string}`>,
      ]);

      const info = (await readContract(wagmiConfig, {
        address: MEDIX_CONTRACT.address as HexAddress,
        abi: MEDIX_ABI,
        functionName: "mediaInfo",
        args: [mediaId],
        chainId: MEDIX_CONTRACT.chainId,
      })) as [boolean, number, string];

      return {
        tokenId: id,
        tokenURI,
        mediaId,
        kind: info[1],
        uri: info[2],
      };
    } catch (error) {
      console.error(`Failed to fetch metadata for token ${id}:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

export async function getSimilars(
  user: HexAddress,
  tokenIds: bigint[]
): Promise<HexAddress[]> {
  const res = await readContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "getsimilars",
    args: [user, tokenIds],
    chainId: MEDIX_CONTRACT.chainId,
  });
  return res as unknown as HexAddress[];
}

export async function mintCompletion(
  to: HexAddress,
  kind: number,
  uri: string,
  name: string
) {
  const pk = (
    import.meta.env.VITE_BACKEND_PRIVATE_KEY ||
    import.meta.env.BACKEND_PRIVATE_KEY ||
    ""
  ).trim();
  if (!pk) throw new Error("Missing backend private key");

  // Format private key correctly - must be 32 bytes hex
  const formattedPk = pk.startsWith("0x") ? pk : `0x${pk}`;
  const account = privateKeyToAccount(formattedPk as `0x${string}`);

  console.log('[NFT] Minting with params:', { to, kind, uri: uri.substring(0, 100) + '...', name });

  const hash = await writeContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "completeAndRegisterByExternalId",
    args: [to, kind, uri, name],
    chainId: MEDIX_CONTRACT.chainId,
    account,
    gas: 500000n, // Increase gas limit to prevent out of gas errors
  });
  
  console.log('[NFT] Transaction sent, hash:', hash);
  
  // Wait for transaction using simpler method to avoid RPC limitations
  // Use timeout and retryCount to handle "block is out of range" errors
  try {
    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash,
      chainId: MEDIX_CONTRACT.chainId,
      confirmations: 1,
      pollingInterval: 3000, // Poll every 3 seconds (slower to avoid rate limits)
      timeout: 120_000, // 2 minutes timeout
      retryCount: 10, // Retry up to 10 times
    });
    
    console.log('[NFT] Transaction receipt:', receipt);
    
    // Check if transaction succeeded
    if (receipt.status === 'reverted') {
      console.error('[NFT] Transaction REVERTED!', {
        hash,
        gasUsed: receipt.gasUsed,
        logs: receipt.logs,
      });
      throw new Error(`Transaction reverted. View on explorer: https://sepolia-blockscout.lisk.com/tx/${hash}`);
    }
    
    console.log('[NFT] Transaction SUCCEEDED!');
    return { hash, receipt };
  } catch (error) {
    // If receipt fails, return hash anyway - transaction might still succeed
    console.warn('[NFT] Could not get receipt, but transaction was sent:', error);
    return { hash, receipt: null };
  }
}

export async function getGroupMemberCount(mediaId: Hex): Promise<bigint> {
  const count = await readContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "groupMemberCount",
    args: [mediaId],
    chainId: MEDIX_CONTRACT.chainId,
  });
  return count as unknown as bigint;
}

export async function getGroupMemberAt(
  mediaId: Hex,
  index: bigint
): Promise<HexAddress> {
  const addr = await readContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "groupMemberAt",
    args: [mediaId, index],
    chainId: MEDIX_CONTRACT.chainId,
  });
  return addr as unknown as HexAddress;
}

export async function mediaInfo(
  mediaId: Hex
): Promise<[boolean, number, string]> {
  const info = await readContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "mediaInfo",
    args: [mediaId],
    chainId: MEDIX_CONTRACT.chainId,
  });
  return info as unknown as [boolean, number, string];
}

export async function tokenMediaId(tokenId: bigint): Promise<Hex> {
  const mid = await readContract(wagmiConfig, {
    address: MEDIX_CONTRACT.address as HexAddress,
    abi: MEDIX_ABI,
    functionName: "tokenMediaId",
    args: [tokenId],
    chainId: MEDIX_CONTRACT.chainId,
  });
  return mid as unknown as Hex;
}

export async function getUserNFTCount(
  userAddress: HexAddress
): Promise<number> {
  try {
    const nfts = await readUserNfts(userAddress);
    return nfts.length;
  } catch (error) {
    console.error("[NFT] Error getting user NFT count:", error);
    return 0;
  }
}
