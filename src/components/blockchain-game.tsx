import React from 'react';
import { Box } from "@mui/material";
import { Game } from "./game.tsx";
import { GameWithHistory } from "./game-with-history.tsx";
import { NftTab } from "./nft-tab.tsx";
import { useTabNavigation } from "../contexts/tab-navigation-context";

export function BlockchainGame() {
  const useHistoryTracking = true;
  const { currentTab } = useTabNavigation();

  return (
    <div className="container" style={{ 
      minHeight: '100%', 
      overflow: 'visible',
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }}>
      <Box sx={{ flex: 1 }}>
        {currentTab === 0 && (
          <section className="game" id="game">
            <div className="game-container">
              {useHistoryTracking ? <GameWithHistory /> : <Game />}
            </div>
          </section>
        )}
        {currentTab === 1 && (
          <section className="game" id="nft">
            <div className="game-container">
              <NftTab />
            </div>
          </section>
        )}
      </Box>

      {/* Footer */}
      <footer className="footer" style={{ marginTop: 'auto' }}>
        <div className="powered-by-polkadot">
          <span className="powered-by-text">Powered by</span>
          <img className="polkadot-logo-footer" src="/polkadot-logo-with-text.svg" alt="Polkadot" />
        </div>
        <p>
          2025-2026
          <img src="/lucky-logo-transparent.png" alt="Lucky" className="lucky-logo-inline" />
          Lucky Team
        </p>
      </footer>
      
    </div>
  );
}