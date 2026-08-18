'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const id = formData.get('id')
  const password = formData.get('password')

  if (id === 'astropdf' && password === 'admin@24') {
    // In Next.js 15/16, cookies() is asynchronous
    const cookieStore = await cookies()
    cookieStore.set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // Expires in 1 week
      path: '/',
    })
  } else {
    return { error: 'Invalid credentials. Please try again.' }
  }
  
  // Redirect must be called outside the try/catch or else block
  redirect('/')
}