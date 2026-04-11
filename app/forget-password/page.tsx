import ForgetPasswordPage from "@/components/forget-password-page";

type ForgetPasswordRouteProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ForgetPasswordRoutePage({ searchParams }: ForgetPasswordRouteProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return <ForgetPasswordPage token={token} />;
}

