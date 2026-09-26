import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduGesture 3D - Live 3D Virtual Classroom',
  description: 'Interactive real-time 3D virtual classroom powered by OpenCV and MediaPipe hand gesture recognition.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
