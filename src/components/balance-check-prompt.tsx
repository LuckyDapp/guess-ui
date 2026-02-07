import { useEffect, useState, useCallback } from "react";
import { useSigner, useChainId } from "@reactive-dot/react";
import { getOrCreateContract } from "../contract";
import { NETWORK_CONFIG } from "../config";
import { PREFLIGHT_FAUCET_REQUEST, PREFLIGHT_FAUCET_DONE } from "../utils/preflight-faucet";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, Box } from "@mui/material";
import { encodeAddress } from "@polkadot/keyring";
import { toast } from "react-hot-toast";

export function BalanceCheckPrompt() {
  const [open, setOpen] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const signer = useSigner();
  const chainId = useChainId();

  const checkBalance = useCallback(async () => {
    if (!signer || !chainId) return;
    
    setCheckingBalance(true);
    setBalance(null);
    
    try {
      const contract = getOrCreateContract(chainId);
      const accountAddress = encodeAddress(signer.publicKey);
      const accountBalance = await contract.getAccountBalance(accountAddress);
      setBalance(accountBalance);
      
      // Si le solde est nul, proposer le transfert
      if (accountBalance === 0n) {
        // Laisser l'utilisateur choisir (transfert ou Skip)
      } else {
        // Solde > 0 : fermer et signaler que le pré-vol est terminé (tx peut continuer)
        setOpen(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(PREFLIGHT_FAUCET_DONE));
        }
      }
    } catch (err) {
      console.error("Error checking balance:", err);
      toast.error("Failed to check account balance");
      setOpen(false);
      window.dispatchEvent(new CustomEvent(PREFLIGHT_FAUCET_DONE));
    } finally {
      setCheckingBalance(false);
    }
  }, [signer, chainId]);

  // Ouvrir la modale uniquement quand une tx est tentée et que le pré-vol faucet est demandé (nœud dev, solde 0)
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setTimeout(() => checkBalance(), 100);
    };
    window.addEventListener(PREFLIGHT_FAUCET_REQUEST, handler);
    return () => window.removeEventListener(PREFLIGHT_FAUCET_REQUEST, handler);
  }, [checkBalance]);

  const handleTransfer = async () => {
    if (!signer || !chainId) return;
    
    setTransferring(true);
    
    try {
      const contract = getOrCreateContract(chainId);
      const decimals = NETWORK_CONFIG.NATIVE_TOKEN_DECIMALS;
      const transferAmount = 100n * 10n ** BigInt(decimals);
      const transferOk = await contract.transferFromEve(signer.publicKey, transferAmount);
      
      if (transferOk) {
        toast.success("Account funded with 100 tokens from Eve");
        setOpen(false);
        setBalance(null);
        window.dispatchEvent(new CustomEvent(PREFLIGHT_FAUCET_DONE));
      } else {
        toast.error("Failed to transfer tokens from Eve");
      }
    } catch (err) {
      console.error("Error transferring tokens:", err);
      toast.error("Failed to transfer tokens from Eve");
    } finally {
      setTransferring(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setBalance(null);
    window.dispatchEvent(new CustomEvent(PREFLIGHT_FAUCET_DONE));
  };

  const formatBalance = (bal: bigint): string => {
    const decimals = NETWORK_CONFIG.NATIVE_TOKEN_DECIMALS;
    const tokens = Number(bal) / Math.pow(10, decimals);
    return tokens.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
      <DialogTitle sx={{ color: "#fff" }}>Account Balance Check</DialogTitle>
      <DialogContent>
        {checkingBalance ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
            <CircularProgress size={24} />
            <Typography sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
              Checking account balance...
            </Typography>
          </Box>
        ) : balance !== null ? (
          <Box sx={{ py: 1 }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6, mb: 2 }}>
              {balance === 0n ? (
                <>
                  Your account balance is <strong style={{ color: "#ff9800" }}>0 tokens</strong>.
                  {NETWORK_CONFIG.FAUCET_AVAILABLE ? (
                    <>
                      <br />
                      <br />
                      Would you like to receive 100 tokens from the Eve faucet account to get started?
                    </>
                  ) : (
                    <>
                      <br />
                      <br />
                      This chain does not support in-app balance transfers. You can still play if the chain allows it.
                    </>
                  )}
                </>
              ) : (
                <>
                  Your account balance is <strong style={{ color: "#4caf50" }}>{formatBalance(balance)} tokens</strong>.
                </>
              )}
            </Typography>
            {transferring && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>
                  Transferring 100 tokens from Eve...
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6 }}>
            Ready to check balance...
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={checkingBalance || transferring} 
          sx={{ color: "#b0b0b0" }}
        >
          {balance !== null && balance !== 0n ? "Close" : "Skip"}
        </Button>
        {balance === 0n && NETWORK_CONFIG.FAUCET_AVAILABLE && !transferring && (
          <Button 
            onClick={handleTransfer} 
            variant="contained" 
            disabled={checkingBalance || transferring || !signer || !chainId}
          >
            Transfer 100 tokens from Eve
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
