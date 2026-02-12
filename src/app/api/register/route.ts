/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// ===== 防爆破缓存（内存级，适合单实例）=====
const rateLimitMap = new Map<
  string,
  { count: number; lastRequest: number; failCount: number }
>();

const inviteFailMap = new Map<string, number>();

const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_FAIL_PER_IP = 5;
const MAX_FAIL_PER_INVITE = 5;


// 存储类型
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | undefined) || 'localstorage';

// 生成邀请码函数
function generateRandomInviteCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 生成 N 个邀请码
function generateInviteList(count = 5, length = 8) {
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    list.push(generateRandomInviteCode(length));
  }
  return list;
}

// ✅ 新增：校验邀请码格式（与生成规则一致）
function isValidInviteFormat(code: string) {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{8}$/.test(
    code
  );
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();

  // ===== IP 频率限制 =====
  const rateData = rateLimitMap.get(ip) || {
    count: 0,
    lastRequest: now,
    failCount: 0,
  };

  if (now - rateData.lastRequest > 60 * 1000) {
    // 1分钟重置
    rateData.count = 0;
    rateData.failCount = 0;
  }

  rateData.count++;
  rateData.lastRequest = now;

  if (rateData.count > MAX_REQUESTS_PER_MINUTE) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429 }
    );
  }

  rateLimitMap.set(ip, rateData);

  try {
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json(
        { error: '当前模式不支持注册' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const config = await getConfig();

    // 初始化邀请码数组
    if (!(config.UserConfig as any).InviteCodes) {
      (config.UserConfig as any).InviteCodes = generateInviteList(5);
      await db.saveAdminConfig(config);
    }

    // ===== 正常注册流程 =====
    if (!config.UserConfig.AllowRegister) {
      return NextResponse.json(
        { error: '当前未开放注册' },
        { status: 400 }
      );
    }

    const { username, password, inviteCode } = await req.json();

    if (!username || !password || !inviteCode) {
      return NextResponse.json(
        { error: '用户名、密码或邀请码不能为空' },
        { status: 400 }
      );
    }

    const inviteList: string[] = (config.UserConfig as any).InviteCodes;
    const usedList: string[] = (config.UserConfig as any).UsedInviteCodes || [];

    // ✅ 放爆破、精细区分“已使用” vs “无效”
    if (!inviteList.includes(inviteCode) || usedList.includes(inviteCode)) {
      rateData.failCount++;

      if (rateData.failCount >= MAX_FAIL_PER_IP) {
        return NextResponse.json(
          { error: '错误次数过多，请稍后再试' },
          { status: 429 }
        );
      }

      // 单邀请码爆破检测
      const inviteFail = inviteFailMap.get(inviteCode) || 0;
      inviteFailMap.set(inviteCode, inviteFail + 1);

      if (inviteFail + 1 >= MAX_FAIL_PER_INVITE) {
        return NextResponse.json(
          { error: '邀请码尝试次数过多' },
          { status: 429 }
        );
      }

      if (isValidInviteFormat(inviteCode)) {
        return NextResponse.json(
          { error: '邀请码已使用' },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: '邀请码无效' }, { status: 400 });
    }

    if (username === process.env.USERNAME) {
      return NextResponse.json({ error: '用户已存在' }, { status: 400 });
    }

    const exist = await db.checkUserExist(username);
    if (exist) {
      return NextResponse.json({ error: '用户已存在' }, { status: 400 });
    }

    // 注册成功
    await db.registerUser(username, password);
    config.UserConfig.Users.push({ username, role: 'user' });
    rateData.failCount = 0;
    rateLimitMap.set(ip, rateData);

    // 标记邀请码已用
    if (!(config.UserConfig as any).UsedInviteCodes) {
      (config.UserConfig as any).UsedInviteCodes = [];
    }
    (config.UserConfig as any).UsedInviteCodes.push(inviteCode);

    await db.saveAdminConfig(config);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('注册接口异常', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
