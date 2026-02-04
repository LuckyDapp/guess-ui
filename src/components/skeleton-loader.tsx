import React from 'react';
import { Box, Skeleton, Typography } from '@mui/material';

interface SkeletonLoaderProps {
  type: 'game' | 'attempt' | 'transaction' | 'connection';
  count?: number;
}

export function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  const renderGameSkeleton = () => (
    <Box sx={{ padding: { xs: "16px 20px 0", sm: "16px 24px 0" }, display: 'flex', justifyContent: 'center' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: '700px',
          background: 'rgba(32, 33, 37, 0.9)',
          borderRadius: '20px',
          p: 3,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Header skeleton */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="text" width={300} height={24} sx={{ mx: 'auto' }} />
        </Box>

        {/* Attempts skeleton */}
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={150} height={28} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                <Skeleton variant="circular" width={20} height={20} sx={{ mr: 2 }} />
                <Skeleton variant="text" width={200} height={20} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Input skeleton */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: '12px' }} />
          <Skeleton variant="rectangular" width={140} height={56} sx={{ borderRadius: '12px' }} />
        </Box>
      </Box>
    </Box>
  );

  const renderAttemptSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', gap: 2 }}>
      <Skeleton variant="circular" width={20} height={20} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width={150} height={20} />
      </Box>
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="circular" width={24} height={24} />
    </Box>
  );

  const renderTransactionSkeleton = () => (
    <Box sx={{
      p: 2,
      mb: 2,
      borderRadius: '16px',
      background: 'rgba(25, 27, 31, 0.95)',
      borderLeft: '4px solid #64b5f6'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="rectangular" width={80} height={24} sx={{ ml: 'auto', borderRadius: '12px' }} />
      </Box>
      <Skeleton variant="text" width={200} height={20} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4 }} />
    </Box>
  );

  const renderConnectionSkeleton = () => (
    <Box sx={{
      p: 2,
      mb: 2,
      borderRadius: '16px',
      background: 'rgba(25, 27, 31, 0.95)',
      borderLeft: '4px solid #64b5f6'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
        <Skeleton variant="text" width={140} height={24} />
        <Skeleton variant="rectangular" width={100} height={24} sx={{ ml: 'auto', borderRadius: '12px' }} />
      </Box>
      <Skeleton variant="text" width={250} height={20} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={100} height={16} />
        <Skeleton variant="text" width={50} height={16} />
      </Box>
      <Skeleton variant="rectangular" width="100%" height={6} sx={{ borderRadius: 3, mt: 1 }} />
    </Box>
  );

  const skeletons = {
    game: renderGameSkeleton,
    attempt: renderAttemptSkeleton,
    transaction: renderTransactionSkeleton,
    connection: renderConnectionSkeleton
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {skeletons[type]()}
        </div>
      ))}
    </>
  );
}

// Specialized loading components
export function GameLoadingState() {
  return <SkeletonLoader type="game" />;
}

export function AttemptsLoadingState({ count = 3 }: { count?: number }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
        Loading Attempts...
      </Typography>
      <SkeletonLoader type="attempt" count={count} />
    </Box>
  );
}

export function TransactionsLoadingState({ count = 2 }: { count?: number }) {
  return <SkeletonLoader type="transaction" count={count} />;
}

export function ConnectionLoadingState() {
  return <SkeletonLoader type="connection" />;
}