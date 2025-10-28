
import { cn } from "@/lib/utils";

export const Icons = {
  logo: ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-6", className)}
      fill="currentColor"
      {...props}
    >
      <title>JiraLogger Pro</title>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-9.5l-2.5 2.5 4 4 8-8-2.5-2.5-5.5 5.5z" />
    </svg>
  ),
};
