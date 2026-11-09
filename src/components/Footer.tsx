export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {currentYear} FreePDFEdit</p>
        <p>Your files never leave your device.</p>
      </div>
    </footer>
  )
}
