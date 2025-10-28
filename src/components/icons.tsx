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
      <path d="M12 0A12 12 0 1 0 12 24A12 12 0 0 0 12 0ZM9.055 18.1H5.977l3.078-3.078v3.078ZM9.055 9.055V5.977L18.1 15.023h-3.078L9.055 9.055Z" />
    </svg>
  ),
};
