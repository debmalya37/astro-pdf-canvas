import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Preset from '@/models/Preset';

export const maxDuration = 60; 

export async function GET() {
  try {
    await connectToDatabase();
    const presets = await Preset.find({}).lean();
    return NextResponse.json(presets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const data = await req.json();
    const newPreset = await Preset.create(data);
    return NextResponse.json(newPreset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const data = await req.json();
    const updatedPreset = await Preset.findOneAndUpdate({ id: data.id }, data, { new: true });
    return NextResponse.json(updatedPreset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    // Only delete user-created presets, keep globals intact
    await Preset.deleteMany({ isGlobal: { $ne: true } }); 
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear presets' }, { status: 500 });
  }
}