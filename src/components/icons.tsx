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
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm4.49 8.51L17 17l-1.51-1.51" />
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" />
      <path d="m16.24 7.76-1.41 1.41C15.55 9.89 16 10.9 16 12s-.45 2.11-1.17 2.83l1.41 1.41C17.42 15.03 18 13.57 18 12s-.58-3.03-1.76-4.24z" />
    </svg>
  ),
};
