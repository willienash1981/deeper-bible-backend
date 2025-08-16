import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorState({ 
  message = "Network error - unable to reach API", 
  onRetry,
  showRetry = true 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Oops! Something went wrong</AlertTitle>
        <AlertDescription>
          {message}
        </AlertDescription>
      </Alert>
      
      {showRetry && onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}