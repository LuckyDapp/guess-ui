import { useEffect, useState, useRef } from "react";
import { useSigner, useChainId } from "@reactive-dot/react";
import { getOrCreateContract, type AccountUnmappedDetail } from "../contract";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

export function MapAccountPrompt() {
  const [open, setOpen] = useState(false);
  const [mapping, setMapping] = useState(false);
  const pendingActionRef = useRef<AccountUnmappedDetail | null>(null);
  const signer = useSigner();
  const chainId = useChainId();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AccountUnmappedDetail>).detail;
      pendingActionRef.current = detail ?? { type: "map_account" };
      setOpen(true);
    };
    window.addEventListener("account-unmapped", handler);
    return () => window.removeEventListener("account-unmapped", handler);
  }, []);

  const handleMap = async () => {
    if (!signer || !chainId) return;
    setMapping(true);
    try {
      const contract = getOrCreateContract(chainId);
      const ok = await contract.mapAccount(signer, chainId);
      if (ok) {
        const detail = pendingActionRef.current;
        setOpen(false);
        if (typeof window !== "undefined" && detail) {
          window.dispatchEvent(new CustomEvent("account-mapped", { detail }));
        }
        pendingActionRef.current = null;
      }
    } finally {
      setMapping(false);
    }
  };

  const handleClose = () => {
    pendingActionRef.current = null;
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.85)" } },
      }}
      PaperProps={{
        sx: {
          backgroundColor: "rgba(30, 30, 30, 0.98)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        },
      }}
    >
      <DialogTitle sx={{ color: "#fff" }}>Account not mapped</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6 }}>
          Your Substrate account must be mapped in the Revive pallet to interact with contracts.
          Click "Map account" to perform this one-time operation per account.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={mapping} sx={{ color: "#b0b0b0" }}>
          Cancel
        </Button>
        <Button onClick={handleMap} variant="contained" disabled={mapping || !signer || !chainId}>
          {mapping ? "Mapping..." : "Map account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
