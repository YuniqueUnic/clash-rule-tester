import fs from "node:fs/promises";
import path from "node:path";

const POINTER_URL =
  "https://raw.githubusercontent.com/iplocate/ip-address-databases/master/ip-to-country/ip-to-country.mmdb";
const LFS_BATCH_URL =
  "https://github.com/iplocate/ip-address-databases.git/info/lfs/objects/batch";

const force = process.argv.includes("--force");

async function getExistingFileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

function parseLfsPointer(pointerText) {
  const oidLine = pointerText.split("\n").find((l) => l.startsWith("oid "));
  const sizeLine = pointerText.split("\n").find((l) => l.startsWith("size "));

  const oid = oidLine?.replace("oid sha256:", "").trim();
  const size = Number.parseInt(sizeLine?.replace("size", "").trim() ?? "", 10);

  if (!oid || Number.isNaN(size) || size <= 0) {
    throw new Error("[geoip] 无法解析 LFS pointer（oid/size 缺失）");
  }

  return { oid, size };
}

async function resolveLfsDownloadUrl({ oid, size }) {
  const response = await fetch(LFS_BATCH_URL, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.git-lfs+json",
      "Content-Type": "application/vnd.git-lfs+json",
    },
    body: JSON.stringify({
      operation: "download",
      transfers: ["basic"],
      objects: [{ oid, size }],
    }),
  });

  if (!response.ok) {
    throw new Error(`[geoip] LFS 批量接口失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  const href = data?.objects?.[0]?.actions?.download?.href;
  if (typeof href !== "string" || !href) {
    throw new Error("[geoip] LFS 批量接口返回缺少 download href");
  }

  return href;
}

async function main() {
  const outputDir = path.join(process.cwd(), "public", "geoip");
  const outputPath = path.join(outputDir, "ip-to-country.mmdb");

  await fs.mkdir(outputDir, { recursive: true });

  const existingSize = await getExistingFileSize(outputPath);

  let pointer;
  try {
    console.log(`[geoip] 获取 LFS pointer：${POINTER_URL}`);
    const pointerResp = await fetch(POINTER_URL);
    if (!pointerResp.ok) {
      throw new Error(`[geoip] 获取 pointer 失败：HTTP ${pointerResp.status}`);
    }
    const pointerText = await pointerResp.text();
    pointer = parseLfsPointer(pointerText);
  } catch (error) {
    // 如果获取 pointer 失败但本地已有文件，则尽量不中断 dev/build
    if (!force && typeof existingSize === "number" && existingSize > 1024) {
      console.warn(
        `[geoip] 获取 pointer 失败，保留现有文件：${outputPath} (${existingSize} bytes)`,
      );
      return;
    }
    throw error;
  }

  if (
    !force &&
    typeof existingSize === "number" &&
    existingSize > 0 &&
    existingSize === pointer.size
  ) {
    console.log(
      `[geoip] 已存在且校验通过，跳过下载：${outputPath} (${existingSize} bytes)`,
    );
    return;
  }

  const downloadUrl = await resolveLfsDownloadUrl(pointer);

  console.log(`[geoip] 下载中：${downloadUrl}`);
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`[geoip] 下载失败：HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

  const stat = await fs.stat(outputPath);
  console.log(`[geoip] 下载完成：${outputPath} (${stat.size} bytes)`);

  if (stat.size !== pointer.size) {
    throw new Error(
      `[geoip] 文件大小不匹配：expected=${pointer.size} actual=${stat.size}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
