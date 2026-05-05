import PdfUploader from './components/PdfUploader';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          PDF Template Editor
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload a PDF to customize its colors, fonts, and layout.
        </p>
        
        <PdfUploader />
      </div>
    </main>
  );
}