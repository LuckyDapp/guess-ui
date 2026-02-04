import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useChainId, useSigner } from "@reactive-dot/react";
import { encodeAddress } from "@polkadot/keyring";
import { getNftContractAddress } from "../config";
import { getOrCreateNftContract } from "../nft-contract";
import { signerToRevive } from "../utils/address-converter";
import { fetchAllTokens, fetchTokensByOwner, type IndexerToken } from "../services/token-indexer";
import { toast } from "react-hot-toast";
import { UI_CONFIG } from "../config";

const modalInputSx = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderWidth: "1px", borderColor: "rgba(255, 255, 255, 0.15)" },
    "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "var(--color-primary)" },
    "& input": { color: "#fff" },
  },
  "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "var(--color-primary)" },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": {
    backgroundColor: "#2d2d2d",
    padding: "0 4px",
    zIndex: 1,
  },
};


function ensureH160(addr: string): string {
  if (!addr) return "";
  const s = addr.trim().replace(/^0x/i, "");
  if (s.length !== 40 || !/^[0-9a-fA-F]+$/.test(s)) return "";
  return "0x" + s.toLowerCase();
}

function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return iso;
  }
}

type ViewMode = "mine" | "all";

export function NftTab() {
  const chainId = useChainId();
  const signer = useSigner();
  const nftAddress = getNftContractAddress(chainId);
  const nftContract = getOrCreateNftContract(chainId);
  const myRevive = signer ? signerToRevive(signer) : "";

  const [viewMode, setViewMode] = useState<ViewMode>("mine");
  const [tokens, setTokens] = useState<IndexerToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState<IndexerToken | null>(null);
  const [burnConfirmOpen, setBurnConfirmOpen] = useState<IndexerToken | null>(null);

  const [mintId, setMintId] = useState("");
  const [mintMaxAttempts, setMintMaxAttempts] = useState("5");
  const [transferTo, setTransferTo] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isBurning, setIsBurning] = useState(false);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      let list: IndexerToken[];
      if (viewMode === "mine" && myRevive) {
        list = await fetchTokensByOwner(myRevive.toLowerCase());
      } else if (viewMode === "all") {
        list = await fetchAllTokens();
      } else {
        list = [];
      }
      setTokens(list.filter((t) => !t.burnt));
    } catch (e) {
      console.error("Failed to load tokens:", e);
      toast.error("Failed to load tokens from indexer");
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, myRevive]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const onTxSuccess = () => {
    loadTokens();
  };

  const handleOpenMint = async () => {
    try {
      const list = await fetchAllTokens();
      const maxId = list.reduce((acc, t) => {
        const n = parseInt(t.tokenId, 10) || 0;
        return Math.max(acc, n);
      }, 0);
      setMintId(String(maxId + 1));
      setMintMaxAttempts("5");
    } catch {
      setMintId("1");
      setMintMaxAttempts("5");
    }
    setMintOpen(true);
  };

  const handleMint = () => {
    if (!signer) {
      toast.error("Connect a wallet or select a dev account");
      return;
    }
    const id = parseInt(mintId, 10) || 0;
    const max = parseInt(mintMaxAttempts, 10) || 0;
    if (isNaN(id) || id < 0) {
      toast.error("Enter a valid token ID");
      return;
    }
    if (isNaN(max) || max < 0) {
      toast.error("Enter a valid max attempts");
      return;
    }
    setIsMinting(true);
    nftContract.mint(
      signer,
      id,
      max,
      {
        onSuccess: () => {
          setIsMinting(false);
          setMintOpen(false);
          setMintId("");
          setMintMaxAttempts("");
          onTxSuccess();
        },
        onError: () => setIsMinting(false),
      },
      chainId ?? "pah"
    );
  };

  const handleTransfer = () => {
    if (!signer || !transferOpen) return;
    const to = ensureH160(transferTo);
    const id = parseInt(transferOpen.tokenId, 10);
    if (!to || to.length !== 42) {
      toast.error("Enter a valid destination address (0x...)");
      return;
    }
    setIsTransferring(true);
    nftContract.transfer(
      signer,
      id,
      to,
      {
        onSuccess: () => {
          setIsTransferring(false);
          setTransferOpen(null);
          setTransferTo("");
          onTxSuccess();
        },
        onError: () => setIsTransferring(false),
      },
      chainId ?? "pah"
    );
  };

  const handleBurn = () => {
    if (!signer || !burnConfirmOpen) return;
    const id = parseInt(burnConfirmOpen.tokenId, 10);
    setIsBurning(true);
    nftContract.burn(
      signer,
      id,
      {
        onSuccess: () => {
          setIsBurning(false);
          setBurnConfirmOpen(null);
          onTxSuccess();
        },
        onError: () => setIsBurning(false),
      },
      chainId ?? "pah"
    );
  };

  const isOwner = (token: IndexerToken) =>
    myRevive && token.ownerAddress?.toLowerCase() === myRevive.toLowerCase();

  const isZeroAddress = nftAddress === "0x0000000000000000000000000000000000000000";

  if (isZeroAddress) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          NFT contract address is not configured. Set NFT_CONTRACT_ADDRESS in constants.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        maxWidth: `${UI_CONFIG.CONTAINER_MAX_WIDTH}px`,
        mx: "auto",
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" sx={{ color: "var(--color-primary)", fontWeight: 600 }}>
          Tokens
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v != null && setViewMode(v)}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.2)",
                "&.Mui-selected": { color: "var(--color-primary)", borderColor: "var(--color-primary)" },
              },
            }}
          >
            <ToggleButton value="mine">My tokens</ToggleButton>
            <ToggleButton value="all">All tokens</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton onClick={loadTokens} disabled={loading} sx={{ color: "rgba(255,255,255,0.7)" }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenMint}
            disabled={!signer}
            sx={{ textTransform: "none" }}
          >
            Mint new token
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: "var(--color-primary)" }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 2,
          }}
        >
          {tokens.map((token) => (
            <Paper
              key={token.id}
              sx={{
                p: 2,
                bgcolor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                position: "relative",
                transition: "border-color 0.2s",
                "&:hover": { borderColor: "rgba(255,255,255,0.15)" },
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  bgcolor: "rgba(var(--color-primary-rgb, 212, 175, 55), 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  border: "1px solid rgba(var(--color-primary-rgb, 212, 175, 55), 0.3)",
                }}
              >
                #{token.tokenId}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Max attempts: {token.maxAttempts}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                Owner: {formatAddress(token.ownerAddress)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Minted {formatDate(token.mintedAt)}
              </Typography>
              {isOwner(token) && (
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                  <Tooltip title="Transfer">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setTransferTo("");
                        setTransferOpen(token);
                      }}
                      sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "var(--color-primary)" } }}
                    >
                      <SwapHorizIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Burn">
                    <IconButton
                      size="small"
                      onClick={() => setBurnConfirmOpen(token)}
                      sx={{ color: "rgba(255,100,100,0.8)", "&:hover": { color: "#f44336" } }}
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {!loading && tokens.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255,255,255,0.03)" }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {viewMode === "mine" && myRevive
              ? "You have no tokens yet."
              : viewMode === "mine"
                ? "Connect a wallet to see your tokens."
                : "No tokens have been minted yet."}
          </Typography>
          {signer && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenMint}
              sx={{ textTransform: "none" }}
            >
              Mint your first token
            </Button>
          )}
        </Paper>
      )}

      {/* Mint dialog */}
      <Dialog
        open={mintOpen}
        onClose={() => !isMinting && setMintOpen(false)}
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.85)" } } }}
        PaperProps={{
          sx: {
            backgroundColor: "#2d2d2d",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            color: "#fff",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fff", pb: 1, backgroundColor: "#2d2d2d" }}>Mint new token</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 320, pt: 2, pb: 1, backgroundColor: "#2d2d2d", overflow: "visible" }}>
          <TextField
            size="small"
            label="Token ID"
            placeholder="Next available"
            value={mintId}
            onChange={(e) => setMintId(e.target.value)}
            type="number"
            sx={modalInputSx}
          />
          <TextField
            size="small"
            label="Max attempts"
            placeholder="e.g. 5"
            value={mintMaxAttempts}
            onChange={(e) => setMintMaxAttempts(e.target.value)}
            type="number"
            sx={modalInputSx}
          />
        </DialogContent>
        <DialogActions sx={{ pt: 1, backgroundColor: "#2d2d2d" }}>
          <Button onClick={() => !isMinting && setMintOpen(false)} disabled={isMinting} sx={{ color: "#fff", backgroundColor: "rgba(255, 255, 255, 0.1)", "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleMint} disabled={isMinting}>
            {isMinting ? "Minting..." : "Mint"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog
        open={!!transferOpen}
        onClose={() => !isTransferring && setTransferOpen(null)}
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.85)" } } }}
        PaperProps={{
          sx: {
            backgroundColor: "#2d2d2d",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            color: "#fff",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fff", pb: 1, backgroundColor: "#2d2d2d" }}>Transfer token #{transferOpen?.tokenId}</DialogTitle>
        <DialogContent sx={{ minWidth: 360, pt: 2, pb: 1, backgroundColor: "#2d2d2d", overflow: "visible" }}>
          <TextField
            fullWidth
            size="small"
            label="Destination address (0x...)"
            placeholder="0x..."
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            sx={modalInputSx}
          />
        </DialogContent>
        <DialogActions sx={{ pt: 1, backgroundColor: "#2d2d2d" }}>
          <Button onClick={() => !isTransferring && setTransferOpen(null)} disabled={isTransferring} sx={{ color: "#fff", backgroundColor: "rgba(255, 255, 255, 0.1)", "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleTransfer} disabled={isTransferring}>
            {isTransferring ? "Transferring..." : "Transfer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Burn confirmation */}
      <Dialog
        open={!!burnConfirmOpen}
        onClose={() => !isBurning && setBurnConfirmOpen(null)}
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.85)" } } }}
        PaperProps={{
          sx: {
            backgroundColor: "#2d2d2d",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            color: "#fff",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fff", pb: 1, backgroundColor: "#2d2d2d" }}>Burn token #{burnConfirmOpen?.tokenId}?</DialogTitle>
        <DialogContent sx={{ backgroundColor: "#2d2d2d" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
            This action cannot be undone. The token will be permanently destroyed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pt: 1, backgroundColor: "#2d2d2d" }}>
          <Button onClick={() => !isBurning && setBurnConfirmOpen(null)} disabled={isBurning} sx={{ color: "#fff", backgroundColor: "rgba(255, 255, 255, 0.1)", "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" } }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleBurn} disabled={isBurning}>
            {isBurning ? "Burning..." : "Burn"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
