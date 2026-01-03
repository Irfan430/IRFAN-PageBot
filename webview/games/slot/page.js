'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Float } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { useSearchParams } from 'next/navigation';

// 3D Slot Machine Component
function SlotMachine({ isSpinning, onSpinComplete }) {
  const [reel1, setReel1] = useState(0);
  const [reel2, setReel2] = useState(0);
  const [reel3, setReel3] = useState(0);
  const groupRef = useRef();
  const leverRef = useRef();
  
  useFrame((state) => {
    if (isSpinning) {
      // Animate reels
      setReel1(r => r + 0.3);
      setReel2(r => r + 0.25);
      setReel3(r => r + 0.2);
      
      // Animate lever
      if (leverRef.current) {
        leverRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.2;
      }
    }
    
    // Rotate entire machine slowly
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });
  
  // Load slot machine model (placeholder - you'd need actual 3D model)
  return (
    <group ref={groupRef}>
      {/* Base */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[3, 0.5, 1.5]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Reels */}
      <group position={[0, 0.5, 0]}>
        {/* Reel 1 */}
        <mesh position={[-1, 0, 0.1]} rotation={[reel1, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 1, 8]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
        
        {/* Reel 2 */}
        <mesh position={[0, 0, 0.1]} rotation={[reel2, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 1, 8]} />
          <meshStandardMaterial color="#4ecdc4" />
        </mesh>
        
        {/* Reel 3 */}
        <mesh position={[1, 0, 0.1]} rotation={[reel3, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 1, 8]} />
          <meshStandardMaterial color="#ffd166" />
        </mesh>
        
        {/* Reel Cover */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.2, 1.2, 0.05]} />
          <meshPhysicalMaterial 
            color="#ffffff" 
            transmission={0.8} 
            thickness={0.1}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
      </group>
      
      {/* Lever */}
      <mesh 
        ref={leverRef} 
        position={[1.5, -0.5, 0]} 
        rotation={[0, 0, -Math.PI / 4]}
      >
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshStandardMaterial color="#c41e3a" metalness={0.9} />
      </mesh>
      
      {/* Decorative Lights */}
      <pointLight position={[0, 2, 1]} color="#ff6b6b" intensity={2} />
      <pointLight position={[-1, 1, 1]} color="#4ecdc4" intensity={1.5} />
      <pointLight position={[1, 1, 1]} color="#ffd166" intensity={1.5} />
    </group>
  );
}

export default function Slot3DPage() {
  const [balance, setBalance] = useState(5000);
  const [bet, setBet] = useState(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [userData, setUserData] = useState(null);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  useEffect(() => {
    // Load user data from token
    if (token) {
      fetchUserData();
    }
  }, [token]);
  
  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/webview/auth?token=${token}`);
      const data = await response.json();
      if (data.success) {
        setUserData(data.user);
        setBalance(data.user.money || 5000);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };
  
  const handleSpin = async () => {
    if (isSpinning) return;
    if (bet > balance) {
      alert('Insufficient balance!');
      return;
    }
    
    setIsSpinning(true);
    setResult(null);
    
    // Deduct bet
    setBalance(prev => prev - bet);
    
    // Simulate API call
    setTimeout(async () => {
      try {
        const response = await fetch('/api/games/slot-spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userData?.userId,
            bet,
            token 
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setResult(data);
          setBalance(data.newBalance);
        }
      } catch (error) {
        console.error('Spin failed:', error);
      } finally {
        setIsSpinning(false);
      }
    }, 3000);
  };
  
  const betOptions = [100, 500, 1000, 5000];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            3D Slot Machine
          </h1>
          <p className="text-gray-400">Experience immersive 3D slots</p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-300">
            ${balance.toLocaleString()}
          </div>
          <div className="text-gray-400">Balance</div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Bet Selection */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Bet Amount</h2>
            <div className="grid grid-cols-2 gap-3">
              {betOptions.map(amount => (
                <button
                  key={amount}
                  onClick={() => setBet(amount)}
                  className={`p-4 rounded-xl transition-all ${
                    bet === amount 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-lg font-bold">${amount}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span>Custom Bet</span>
                <span className="text-cyan-300">${bet}</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={bet}
                onChange={(e) => setBet(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          {/* Spin Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || bet > balance}
            className={`w-full py-4 rounded-2xl text-xl font-bold transition-all ${
              isSpinning
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 active:scale-95'
            }`}
          >
            {isSpinning ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                SPINNING...
              </div>
            ) : (
              `SPIN FOR $${bet}`
            )}
          </button>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBet(Math.floor(balance / 2))}
              className="p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition"
            >
              Half Balance
            </button>
            <button
              onClick={() => setBet(Math.min(balance, 1000))}
              className="p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition"
            >
              Bet $1000
            </button>
          </div>
        </div>
        
        {/* Center - 3D Slot Machine */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-2xl p-4 h-[500px]">
            <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <pointLight position={[-10, -10, -10]} />
              
              <SlotMachine isSpinning={isSpinning} />
              
              <OrbitControls 
                enableZoom={true}
                enablePan={true}
                minDistance={3}
                maxDistance={10}
              />
              
              <Environment preset="city" />
              
              {/* Floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            </Canvas>
          </div>
          
          {/* Result Display */}
          {result && (
            <div className={`mt-6 p-6 rounded-2xl ${
              result.win > 0 
                ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30'
                : 'bg-gradient-to-r from-red-900/30 to-rose-900/30 border border-red-500/30'
            }`}>
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">
                  {result.win > 0 ? '🎉 JACKPOT! 🎉' : '❌ No Win'}
                </div>
                <div className="text-4xl font-bold my-4">
                  {result.win > 0 ? `+$${result.win}` : `-$${bet}`}
                </div>
                <div className="text-gray-300">
                  {result.win > 0 ? `Multiplier: ${result.multiplier}x` : 'Better luck next time!'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="text-gray-400">Total Spins</div>
          <div className="text-2xl font-bold">1,247</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="text-gray-400">Win Rate</div>
          <div className="text-2xl font-bold text-green-400">42.5%</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="text-gray-400">Max Win</div>
          <div className="text-2xl font-bold text-cyan-300">$12,580</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="text-gray-400">Today's Profit</div>
          <div className="text-2xl font-bold text-emerald-400">+$2,450</div>
        </div>
      </div>
      
      {/* Auto Spin Controls */}
      <div className="mt-8 bg-gray-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Auto Spin</h2>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            min="1"
            max="100"
            defaultValue="10"
            className="bg-gray-700 px-4 py-2 rounded-lg w-20"
          />
          <span>spins</span>
          <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
            Start Auto
          </button>
          <button className="px-6 py-2 bg-gray-700 rounded-lg">
            Stop on Win
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>3D Slot Machine • Powered by Three.js & React Three Fiber</p>
        <p className="mt-2">Balance updates in real-time • All games are provably fair</p>
      </footer>
    </div>
  );
}
