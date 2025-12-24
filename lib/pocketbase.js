import PocketBase from "pocketbase";

let pb;

export default function getPB() {
  if (!pb) {
    const url = process.env.NEXT_PUBLIC_PB_URL || "http://127.0.0.1:8090";
    pb = new PocketBase(url);
    pb.autoCancellation(false);
  }
  return pb;
}
