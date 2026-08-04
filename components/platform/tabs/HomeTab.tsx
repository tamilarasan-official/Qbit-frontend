'use client';

import React, { useState, useRef, useEffect } from 'react';
import { QrCode, ArrowRight, X, Camera, Trophy, Sparkles, MessageSquare, Crown, TrendingUp } from "lucide-react";
import { createClient } from '@/utils/supabase/client';
import { getRankFromPoints, getRankStats } from '@/lib/ranks';

// QR Scanner Modal Component
const QRScannerModal = ({ isOpen, onClose, onScanSuccess }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onScanSuccess: (data: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);

  useEffect(() => {
    setHasBarcodeDetector('BarcodeDetector' in window);
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
        
        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(() => {
          scanQRCode();
        }, 500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Use the BarcodeDetector API if available (Chrome/Edge)
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        barcodeDetector.detect(canvas)
          .then((barcodes: any[]) => {
            if (barcodes.length > 0) {
              const qrData = barcodes[0].rawValue;
              stopCamera();
              // Check if it's a URL, if yes navigate to it, otherwise use as quiz code
              if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
                window.location.href = qrData;
              } else {
                onScanSuccess(qrData);
              }
            }
          })
          .catch((err: any) => console.error('Barcode detection error:', err));
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-400 p-4 sm:p-6 text-black relative">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition-all hover:scale-110"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 pr-8">
              <h2 className="text-xl sm:text-2xl font-bold">Scan QR Code</h2>
              <p className="text-white/80 text-xs sm:text-sm">Position the QR code within the frame</p>
            </div>
          </div>
        </div>

        {/* Video Feed */}
        <div className="relative bg-black aspect-square">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="text-center">
                <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-white text-base sm:text-lg mb-1 sm:mb-2 font-semibold">Camera Access Required</p>
                <p className="text-gray-400 text-xs sm:text-sm px-4">{error}</p>
                <button
                  onClick={startCamera}
                  className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 sm:py-2.5 bg-white text-brand-700 rounded-xl font-medium hover:bg-gray-100 transition-all hover:scale-105 text-sm sm:text-base"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Frame Overlay */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64">
                    {/* Corner brackets - responsive sizing */}
                    <div className="absolute top-0 left-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-l-[3px] border-t-[3px] sm:border-l-4 sm:border-t-4 border-white rounded-tl-2xl animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-r-[3px] border-t-[3px] sm:border-r-4 sm:border-t-4 border-white rounded-tr-2xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-l-[3px] border-b-[3px] sm:border-l-4 sm:border-b-4 border-white rounded-bl-2xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-r-[3px] border-b-[3px] sm:border-r-4 sm:border-b-4 border-white rounded-br-2xl animate-pulse"></div>

                    {/* Scanning line animation */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="w-full h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-scan"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-400 rounded-full mt-1 sm:mt-1.5 flex-shrink-0"></div>
              <p>Align the QR code within the frame for automatic scanning</p>
            </div>
            {hasBarcodeDetector ? (
              <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-green-600">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mt-1 sm:mt-1.5 flex-shrink-0 animate-pulse"></div>
                <p>QR Scanner is active and ready</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-amber-600">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full mt-1 sm:mt-1.5 flex-shrink-0"></div>
                <p>QR Scanner requires Chrome/Edge browser for best results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main HomeTab Component
export function HomeTab() {
  const [quizCode, setQuizCode] = useState("");
  const [inputError, setInputError] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [userRankInfo, setUserRankInfo] = useState<any>(null);
  const [userName, setUserName] = useState<string>("Champion");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const quickActions = [
    // One brand family. The old set mixed amber, lime and a purple-to-pink
    // gradient, which read as three different products on one row.
    { name:"Leaderboard", icon: Trophy, blurb:"See where you stand", link:"/leaderboard" },
    { name:"Resources", icon: Sparkles, blurb:"Notes and material", link:"/resources" },
    { name:"Discussion", icon: MessageSquare, blurb:"Ask your batch", link:"/discussion" },
  ];

  // Generate personalized motivational quote
  const getMotivationalQuote = () => {
    if (!userRankInfo) return null;

    const { rankStats } = userRankInfo;
    const currentRank = rankStats.current;
    const nextRank = rankStats.next;

    const quotes = [
      {
        text: `${userName}, every great achievement starts with the decision to try. Your ${currentRank.name} rank is just the beginning!`,
        icon: "🚀"
      },
      {
        text: `Keep pushing forward, ${userName}! The gap between ${currentRank.name} and ${nextRank?.name || 'greatness'} is filled with effort and determination.`,
        icon: "💪"
      },
      {
        text: `${userName}, champions aren't made in gyms. Champions are made from something deep inside—a desire, a dream, a vision. Reach for ${nextRank?.name || 'the top'}!`,
        icon: "👑"
      },
      {
        text: `Success is the sum of small efforts repeated day in and day out, ${userName}. Your journey from ${currentRank.name} to ${nextRank?.name || 'legend'} starts now!`,
        icon: "⭐"
      },
      {
        text: `${userName}, you're currently a ${currentRank.name}. Don't stop until you're proud! The ${nextRank?.name || 'pinnacle'} awaits.`,
        icon: "🎯"
      },
      {
        text: `Believe in yourself, ${userName}. You have the power to rise from ${currentRank.name} to ${nextRank?.name || 'greatness'}. Start today!`,
        icon: "✨"
      },
      {
        text: `${userName}, the only limit to your impact is your imagination. Your ${currentRank.name} status is temporary—${nextRank?.name || 'excellence'} is within reach!`,
        icon: "🌟"
      },
      {
        text: `Hard work beats talent when talent doesn't work hard, ${userName}. Let's climb from ${currentRank.name} to ${nextRank?.name || 'the summit'}!`,
        icon: "🏆"
      },
    ];

    // Randomly select a quote (refreshes on every page load)
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  };

  useEffect(() => {
    fetchLeaderboardInfo();
  }, []);

  const fetchLeaderboardInfo = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const displayName = profile.full_name ||
                           user.user_metadata?.full_name ||
                           user.user_metadata?.name ||
                           profile.email?.split('@')[0] ||
                           'Champion';
        setUserName(displayName);
      }

      // Get current user's rank info
      const { data: userLeaderboard } = await supabase
        .from('leaderboard')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userLeaderboard) {
        const rankStats = getRankStats(userLeaderboard.total_points);
        setUserRankInfo({
          points: userLeaderboard.total_points,
          rankStats: rankStats,
        });
      }
    } catch (error) {
      console.error('Error fetching leaderboard info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQuiz = () => {
    if (quizCode.trim().length === 0) {
      setInputError(true);
      return;
    }
    setInputError(false);
    // Route to student lobby page which handles auto-join
    window.location.href = `/student/session/${quizCode.trim()}/lobby`;
  };

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleScanSuccess = (scannedCode: string) => {
    setShowScanner(false);
    // Route to student lobby page which handles auto-join
    window.location.href = `/student/session/${scannedCode}/lobby`;
  };

  // One lime bloom behind the top of the page, as on the marketing site. The
  // three pulsing blobs this replaces tinted the whole canvas an uneven
  // yellow-green and never sat still.
  return (
    <div className="brand-canvas relative min-h-screen bg-background transition-colors duration-300">

      <div className="relative z-10 space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Welcome back
          </h1>
          <p className="mt-1.5 text-base text-muted-foreground">Pick up where you left off.</p>
        </div>

        {/* Rank & Motivational Quote */}
        {!loading && userRankInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User's Current Rank */}
            {userRankInfo && (
              <div className="group bg-gradient-to-br from-white to-brand-100/50 dark:from-slate-800 dark:to-slate-750 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Your Rank</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{userRankInfo.rankStats.current.emoji}</span>
                      <div>
                        <p className={`text-xl font-bold ${userRankInfo.rankStats.current.color}`}>
                          {userRankInfo.rankStats.current.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {userRankInfo.points.toLocaleString()} points
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${userRankInfo.rankStats.current.gradient} opacity-30 group-hover:opacity-50 transition-opacity`}>
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>

                {!userRankInfo.rankStats.isMaxRank && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <span>Progress to {userRankInfo.rankStats.next.emoji} {userRankInfo.rankStats.next.name}</span>
                      <span className="font-medium">{Math.round(userRankInfo.rankStats.progress)}%</span>
                    </div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-400/30 dark:border-gray-600">
                      <div
                        className={`h-full bg-gradient-to-r ${userRankInfo.rankStats.next.gradient} rounded-full transition-all duration-500 shadow-lg relative`}
                        style={{ width: `${userRankInfo.rankStats.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent"></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {userRankInfo.rankStats.pointsNeeded.toLocaleString()} points to next rank
                    </p>
                  </div>
                )}
                {userRankInfo.rankStats.isMaxRank && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 text-center">
                      👑 Maximum rank achieved!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Motivational Quote */}
            {(() => {
              const quote = getMotivationalQuote();
              return quote && (
                <div className="group relative bg-gradient-to-br from-purple-50 via-brand-100 to-brand-100 dark:from-purple-900/10 dark:via-brand-900/10 dark:to-brand-900/10 rounded-2xl p-6 shadow-lg border-2 border-purple-200/50 dark:border-purple-800/30 hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/20 to-brand-300/20 dark:from-purple-500/10 dark:to-brand-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-500"></div>

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1">
                          <Sparkles className="w-4 h-4" />
                          Daily Motivation
                        </h3>
                      </div>
                      <div className="text-4xl">
                        {quote.icon}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm mb-4">
                      <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
                        "{quote.text}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                          {userRankInfo.rankStats.next ? `${userRankInfo.rankStats.pointsNeeded.toLocaleString()} pts to ${userRankInfo.rankStats.next.name}` : 'Max Rank Achieved!'}
                        </span>
                      </div>
                      <a
                        href="/leaderboard"
                        className="text-sm font-medium text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
                      >
                        View Leaderboard
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick actions */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground sm:mb-4 sm:text-xl">
            <Sparkles className="h-5 w-5 text-brand-700 dark:text-brand-400" />
            Quick actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <a
                key={action.name}
                href={action.link}
                className="group surface-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background transition-colors duration-300 group-hover:bg-brand-400 group-hover:text-ink sm:h-12 sm:w-12">
                    <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{action.name}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{action.blurb}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Join Quiz Section */}
        <section>
          {/*
            An ink panel with a lime bloom, not a flat lime block: the supporting
            copy here used to be white-on-lime, which is unreadable, and lime is
            a surface colour in this brand -- it carries ink type, not white.
          */}
          <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-lifted sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(28rem 28rem at 88% -20%, hsl(var(--brand) / 0.30), transparent 62%), radial-gradient(22rem 22rem at 6% 120%, hsl(var(--brand) / 0.14), transparent 60%)',
              }}
            />

            <div className="relative z-10">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex-1">
                  <span className="mb-3 inline-block rounded-full bg-brand-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
                    Live now
                  </span>
                  <h2 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                    Join a quiz
                  </h2>
                  <p className="text-base text-white/65 sm:text-lg">
                    Enter the code your mentor gave you, or scan the QR on screen.
                  </p>
                </div>
                <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 backdrop-blur sm:flex">
                  <QrCode className="h-8 w-8 text-brand-400" />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter quiz code (e.g. QZ1234)"
                      value={quizCode}
                      onChange={(e) => {
                        setQuizCode(e.target.value.toUpperCase());
                        setInputError(false);
                      }}
                      className={`numeric w-full rounded-full bg-white px-5 py-3.5 text-base font-semibold uppercase tracking-[0.12em] text-ink placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 sm:text-lg ${
                        inputError ? 'ring-2 ring-red-400' : ''
                      }`}
                      maxLength={10}
                    />
                    {inputError && (
                      <p className="ml-1 mt-2 text-xs font-medium text-red-300 sm:text-sm">
                        Enter your quiz code to continue
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={handleJoinQuiz}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-400 px-6 py-3.5 font-bold text-ink shadow-lime transition-all duration-200 hover:-translate-y-px hover:bg-brand-300 sm:flex-initial"
                    >
                      <span className="text-sm sm:text-base">Join quiz</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <button
                      onClick={handleScanQR}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-white transition-all duration-200 hover:-translate-y-px hover:bg-white/20 sm:px-6"
                    >
                      <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden text-sm sm:inline sm:text-base">Scan QR</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-white/50 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                <span>Your mentor will share the code when the quiz starts</span>
              </div>
            </div>
          </div>
        </section>    
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}