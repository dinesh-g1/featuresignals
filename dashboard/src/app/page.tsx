import { redirect } from "next/navigation";
import { path } from "@/lib/paths";

export default function Home() {
  redirect(path("/login"));
}
