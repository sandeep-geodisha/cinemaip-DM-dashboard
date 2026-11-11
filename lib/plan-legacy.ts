// Fingerprints of earlier default wording for plan tasks (title, summary,
// description), by task id. When a stored task still has one of these, nobody
// edited it, so it is safely replaced by the current wording from lib/plan.ts.
// Text someone changed by hand never matches and is kept as it is.
// Add the current fingerprints here before changing plan wording again.

/** sha256, first 16 hex characters. */
export const LEGACY_PLAN_WORDING: Record<string, [title: string, summary: string, description: string][]> = {
  "decision:cash-cap": [["23ee1b00cc902fda", "de5d4f34555dec5b", "11c896cf2ce5c17c"]],
  "decision:team-time": [["26191818ddfb2a58", "1228ff06c1a9ecde", "5c27cb3e04d662b6"]],
  "decision:prize-partners": [["c0812988716aba01", "f4259f4d33a82290", "6f83ebd03658c757"]],
  "decision:geo": [["a536182d4b4f7dec", "4871b344ae942901", "2721d6f4d164f30b"]],
  "decision:points": [["77deabe238de2f6d", "4686fb53bb8e81ad", "ddfa61669bedc505"]],
  "decision:bots": [["f17c0acbd8e50c78", "73cd014b67aca296", "5bb4cc4b94b76178"]],
  "decision:legal-check": [["23806b2e923aa37d", "1c9e441e896ad58f", "3c8e92531a24566a"]],
  "activity:p1-i1": [["71beb35d862633c3", "7317b649d7f71d11", "5146218f77c6e2f7"]],
  "activity:p1-i3": [["4a2a5ac801b8d3e3", "cc1dbc7007687e86", "1f56cec51b3c54b5"]],
  "activity:p1-i2": [["f63895de94081a2b", "e23c1867aae40a6e", "a1122d96b912618d"]],
  "activity:p1-i9": [["da05b26dc62fb58e", "cd0ad2842d247403", "a241f0a2741b5c88"]],
  "activity:p1-i6": [["a0de5d54c9d6e62a", "a663ab68a18c9337", "31b668d17b2feae8"]],
  "activity:p1-i4": [["2286179eced86439", "2e2abaee3b384b17", "2b76e5d5010eab3c"]],
  "activity:p1-i11": [["8761840d35fe8bc3", "bb875f14008826ff", "11c2d3defa119a3a"]],
  "activity:p2-i7": [["4785736328b7dcee", "48da943637cc347d", "f943e027e02443a1"]],
  "activity:p2-i8": [["82931d52b45e1022", "3b5500131570a6e3", "b7ca15e7a318107c"]],
  "activity:p2-i10": [["5c796b6e76f7b23d", "b04b067f9a4eaa99", "b64961e8e8c737cf"]],
  "activity:p2-i12": [["f30c6d0ba4136228", "88d4d4983dda8707", "a356f1b5d7718a7d"]],
  "activity:p2-i3": [["45350da22acf9fba", "cc1dbc7007687e86", "e36d129de2e8338a"]],
  "activity:p3-i9": [["64344310e50d727a", "cd0ad2842d247403", "9363eb2a95928f56"]],
  "activity:p3-i4": [["49067d3f02e4cadd", "2e2abaee3b384b17", "2002b6a863344372"]],
  "activity:p3-i8": [["07131ff056e2e76d", "3b5500131570a6e3", "91862bb17ab1faeb"]],
  "activity:p3-i5": [["7799d4464ec353fa", "5ddcd376e0a4fb15", "b9c17d90c2821e87"]],
  "initiative:1": [["b14769ee49e14b89", "32a6ad00718f4d91", "1091c85099805fae"]],
  "initiative:2": [["89a83e6dc38685c7", "f20cb6822b6bc343", "2d5ebfb64609ba5b"]],
  "initiative:3": [["84a2f957884afcb2", "21c6d54c956b1da5", "fb5ece3104884dd8"]],
  "initiative:4": [["8786ac01aa5fc7fd", "956135b94bfab2a0", "12883ebef6ebb899"]],
  "initiative:5": [["3e80919f8e4bd2e2", "b1ac5c2e590bada1", "923b9c0abf2d5e0f"]],
  "initiative:6": [["e458203852d706ab", "9de5dc9e43c2fd9b", "47ed9ff52e94ab64"]],
  "initiative:7": [["7873909dd0fc51c4", "8ca4f9ee3f1e53e6", "90b63d0277bb7ad3"]],
  "initiative:8": [["7df193c833981a42", "de9bb3e8749c4d90", "ea165ec76de0aae4"]],
  "initiative:9": [["8eac8a3b5faff59b", "e237294dc5039466", "ef468ef56ecebeae"]],
  "initiative:10": [["17074b98a9f9910b", "fefb90e6dd096bbd", "10f5479000efcf89"]],
  "initiative:11": [["8d73757960975f0b", "c7a0c2813896ffc1", "97cd5514eb1e7a62"]],
  "initiative:12": [["61ab7c3fd3e2e223", "b10dc5715774e592", "f2a99ab4f2271a94"]],
};
