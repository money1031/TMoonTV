/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 生成邀请码函数
function generateRandomInviteCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateInviteList(count = 5, length = 8) {
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    list.push(generateRandomInviteCode(length));
  }
  return list;
}

// GET 获取未使用邀请码
export async function GET(req: NextRequest) {
  try {
    const config = await getConfig();

    const inviteList: string[] =
      (config.UserConfig as any).InviteCodes || [];

    const usedList: string[] =
      (config.UserConfig as any).UsedInviteCodes || [];

    const unused = inviteList.filter(
      (c: string) => !usedList.includes(c)
    );

    return NextResponse.json({ inviteCodes: unused });
  } catch (err) {
    console.error('获取邀请码失败', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST 生成新邀请码
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let count = Number(body.count) || 5;

  // 限制范围防止滥用
  if (count < 1) count = 1;
  if (count > 50) count = 50;

  try {
    const config = await getConfig();

    const newList = generateInviteList(count);

    (config.UserConfig as any).InviteCodes = newList;
    (config.UserConfig as any).UsedInviteCodes = [];

    await db.saveAdminConfig(config);

    return NextResponse.json({ inviteCodes: newList });
  } catch (err) {
    console.error('刷新邀请码失败', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
