import { Link } from "wouter"
import { Globe, ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10 text-blue-600" />
        </div>
        <div className="text-7xl font-extrabold text-blue-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
              <Globe className="w-4 h-4 mr-2" /> Go to Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-200 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
