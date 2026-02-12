/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { checkForUpdates, CURRENT_VERSION, UpdateStatus } from '@/lib/version';
import { motion } from 'framer-motion';

/* ---------- 按钮 ---------- */
interface LoadingButtonProps {
  loading: boolean;
  onClick?: () => void;
  children: string;
  className?: string;
  type?: 'button' | 'submit';
}

function LoadingButton({
  loading,
  onClick,
  children,
  className = '',
  type = 'button',
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      className={`flex-1 py-3 rounded-lg text-white transition transform duration-150 ease-out
        ${loading ? 'bg-gray-400 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        ${className}`}
    >
      {loading ? `正在${children}` : children}
    </button>
  );
}

/* ---------- 版本显示组件 ---------- */
function VersionDisplay() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const status = await checkForUpdates();
        setUpdateStatus(status);
      } catch (_) {
        // do nothing
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdate();
  }, []);

  return (
    <button
      onClick={() =>
        window.open('https://github.com/money1031/TMoonTV', '_blank')
      }
      className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 transition-colors cursor-pointer'
    >
      <span className='font-mono'>v{CURRENT_VERSION}</span>
      {!isChecking && updateStatus !== UpdateStatus.FETCH_FAILED && (
        <div
          className={`flex items-center gap-1.5 ${
            updateStatus === UpdateStatus.HAS_UPDATE
              ? 'text-yellow-600 dark:text-yellow-400'
              : updateStatus === UpdateStatus.NO_UPDATE
                ? 'text-green-600 dark:text-green-400'
                : ''
          }`}
        >
          {updateStatus === UpdateStatus.HAS_UPDATE && (
            <>
              <AlertCircle className='w-3.5 h-3.5' />
              <span className='font-semibold text-xs'>有新版本</span>
            </>
          )}
          {updateStatus === UpdateStatus.NO_UPDATE && (
            <>
              <CheckCircle className='w-3.5 h-3.5' />
              <span className='font-semibold text-xs'>已是最新</span>
            </>
          )}
        </div>
      )}
    </button>
  );
}

/* ---------- 主页面 ---------- */
function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteName } = useSite();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [enableRegister, setEnableRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* 注册成功 Modal */
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);

  /* ---------- 登录 ---------- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('用户名或密码不能为空');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const target = searchParams.get('redirect') || '/';
        router.replace(target);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------- 注册 ---------- */
  const handleRegister = async () => {
    setError(null);

    if (!username || !password || !inviteCode) {
      setError('用户名、密码或邀请码不能为空');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, inviteCode }),
      });

      if (res.ok) {
        setShowRegisterSuccess(true);
        setEnableRegister(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="relative min-h-screen flex items-center justify-center px-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        key={enableRegister ? 'register' : 'login'}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-3xl bg-white/80 dark:bg-zinc-900/80 p-10 shadow-2xl"
      >
        <h1 className="text-center text-3xl font-extrabold mb-8 text-green-600">
          {siteName}
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full rounded-lg px-4 py-3"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg px-4 py-3"
          />

          {enableRegister && (
            <div>
              <input
                placeholder="邀请码（请向管理员获取）"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                className="w-full rounded-lg px-4 py-3"
              />
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-4">
            {enableRegister ? (
              <>
                <LoadingButton loading={loading} onClick={handleRegister} className="bg-blue-600">
                  注册
                </LoadingButton>
                <LoadingButton loading={loading} onClick={() => setEnableRegister(false)} className="bg-green-600">
                  返回登录
                </LoadingButton>
              </>
            ) : (
              <>
                <LoadingButton loading={loading} type="submit" className="bg-green-600">
                  登录
                </LoadingButton>
                <LoadingButton loading={loading} onClick={() => setEnableRegister(true)} className="bg-blue-600">
                  开启注册
                </LoadingButton>
              </>
            )}
          </div>
        </form>

        {/* ⭐ 下载按钮优化（两行 / 不失真 / 立体） */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            ['Android', 'https://img.shields.io/badge/Android-5.0+(API_21)-3DDC84?logo=android', 'https://wwbow.lanzouu.com/b019vo60tc'],
            ['iOS', 'https://img.shields.io/badge/iOS-13.0+-000000?logo=ios', 'https://wwbow.lanzouu.com/b019vo615e'],
            ['macOS', 'https://img.shields.io/badge/macOS-11.0+-000000?logo=apple', 'https://wwbow.lanzouu.com/b019vo60yh'],
            ['Windows', 'https://img.shields.io/badge/Windows-10+-0078D6?logo=windows', 'https://wwbow.lanzouu.com/b019vo619i'],
          ].map(([name, img, url]) => (
            <button
              key={name}
              title={`${name} - 点击前往下载，密码6666`}
              onClick={() => window.open(url, '_blank')}
              className="flex items-center justify-center h-12 rounded-lg bg-white dark:bg-zinc-800 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
            >
              <img
                src={img}
                alt={name}
                className="h-6 w-auto object-contain"
              />
            </button>
          ))}
        </div>

        {/* ⭐ 新增说明注释 */}
        <p className="mt-5 text-xs leading-relaxed text-center text-gray-500 dark:text-gray-400">
          APP客户端保证原汁原味的同时，优化了移动端和桌面端操作体验。它基于 Flutter 构建，
          目前支持 Android、iOS、macOS 和 Windows 平台。点击对应操作系统图标前往下载，
          密码均为 <span className="font-semibold text-gray-600 dark:text-gray-300">6666</span>
        </p>
      </motion.div>

      <VersionDisplay />

      {/* 注册成功 Modal */}
      {showRegisterSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 text-center">
            <h3 className="text-lg font-bold mb-4 text-green-600">注册成功</h3>
            <p className="text-sm mb-6">现在可以使用你的账号登录了</p>
            <button
              onClick={() => setShowRegisterSuccess(false)}
              className="w-full py-2 rounded-lg bg-green-600 text-white hover:scale-105 active:scale-95 transition"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
