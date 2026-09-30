import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { toolRegistry } from '@/lib/tools';

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { toolName, action, payload, approved } = await req.json();

    if (!approved) {
      db.logAgentAction({
        id: `act_${Date.now()}`,
        userId: user.id,
        toolName,
        action,
        summary: `Action "${action}" was cancelled by user.`,
        status: 'cancelled',
        permissionLevel: 'WRITE',
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: false,
        cancelled: true,
        message: 'Action was cancelled.',
      });
    }

    const tool = toolRegistry[toolName];
    if (!tool) {
      return NextResponse.json({ error: `Tool ${toolName} not found` }, { status: 404 });
    }

    const result = await tool.execute(action, payload, user.id);

    db.logAgentAction({
      id: `act_${Date.now()}`,
      userId: user.id,
      toolName,
      action,
      summary: result.message,
      status: result.success ? 'success' : 'failed',
      permissionLevel: 'WRITE',
      details: result.data,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: result.success,
      result,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Execution failed' }, { status: 500 });
  }
}
