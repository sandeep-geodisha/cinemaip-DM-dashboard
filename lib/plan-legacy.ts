// Fingerprints of earlier default wording for plan tasks (title, summary,
// description), by task id. When a stored task still has one of these, nobody
// edited it, so it is safely replaced by the current wording from lib/plan.ts.
// Text someone changed by hand never matches and is kept as it is.
// Add the current fingerprints here before changing plan wording again.

/** sha256, first 16 hex characters. */
export const LEGACY_PLAN_WORDING: Record<string, [title: string, summary: string, description: string][]> = {
  "decision:cash-cap": [["23ee1b00cc902fda", "de5d4f34555dec5b", "11c896cf2ce5c17c"], ["23ee1b00cc902fda", "de5d4f34555dec5b", "11c896cf2ce5c17c"], ["fb9686eee5d99142", "de5d4f34555dec5b", "11c896cf2ce5c17c"]],
  "decision:team-time": [["26191818ddfb2a58", "1228ff06c1a9ecde", "5c27cb3e04d662b6"], ["26191818ddfb2a58", "1228ff06c1a9ecde", "88f0360cf084d366"], ["53e1d1f2de036970", "1228ff06c1a9ecde", "c491e0ea46cc5f40"]],
  "decision:prize-partners": [["c0812988716aba01", "f4259f4d33a82290", "6f83ebd03658c757"], ["c0812988716aba01", "f4259f4d33a82290", "1c67faf3b6e70e84"], ["4a8ac4ed53404105", "f4259f4d33a82290", "befbacc6d5932fef"]],
  "decision:geo": [["a536182d4b4f7dec", "4871b344ae942901", "2721d6f4d164f30b"], ["a536182d4b4f7dec", "4871b344ae942901", "7fb25be677a70db3"], ["6a429ab5643a11bd", "4871b344ae942901", "a6004640a410e5c3"]],
  "decision:points": [["77deabe238de2f6d", "4686fb53bb8e81ad", "ddfa61669bedc505"], ["77deabe238de2f6d", "4686fb53bb8e81ad", "34a8a22503d287a0"], ["21f628bcf8e199f3", "4686fb53bb8e81ad", "b4970424ccc6775e"]],
  "decision:bots": [["f17c0acbd8e50c78", "73cd014b67aca296", "5bb4cc4b94b76178"], ["f17c0acbd8e50c78", "73cd014b67aca296", "a34c40703c23da74"], ["b9131b7c917784f1", "73cd014b67aca296", "3a24825d3f0a9ad3"]],
  "decision:legal-check": [["23806b2e923aa37d", "1c9e441e896ad58f", "3c8e92531a24566a"], ["23806b2e923aa37d", "1c9e441e896ad58f", "5846fa301c4e88a7"], ["194a52eba43db03b", "1c9e441e896ad58f", "389defa8f233707e"]],
  "activity:p1-i1": [["71beb35d862633c3", "7317b649d7f71d11", "5146218f77c6e2f7"], ["71beb35d862633c3", "e375f3dc928ec311", "884237ecd0acebff"], ["519ae71c3a855f86", "e375f3dc928ec311", "884237ecd0acebff"]],
  "activity:p1-i3": [["4a2a5ac801b8d3e3", "cc1dbc7007687e86", "1f56cec51b3c54b5"], ["4a2a5ac801b8d3e3", "3584d29a9158436d", "24d9f5271cd9c1b6"], ["a173fb1a7d368b54", "3584d29a9158436d", "4988c3c912699b86"]],
  "activity:p1-i2": [["f63895de94081a2b", "e23c1867aae40a6e", "a1122d96b912618d"], ["f63895de94081a2b", "689d664780424b2e", "552bc21f9713acc7"], ["ca927694991f0282", "689d664780424b2e", "552bc21f9713acc7"]],
  "activity:p1-i9": [["da05b26dc62fb58e", "cd0ad2842d247403", "a241f0a2741b5c88"], ["da05b26dc62fb58e", "8dd7365ec05fa56d", "e0c89f1913de3701"], ["7873006646e0c72d", "8dd7365ec05fa56d", "e0c89f1913de3701"]],
  "activity:p1-i6": [["a0de5d54c9d6e62a", "a663ab68a18c9337", "31b668d17b2feae8"], ["a0de5d54c9d6e62a", "04df429269b50eb8", "c40be86f65d673a8"], ["9063b383d7925090", "04df429269b50eb8", "c40be86f65d673a8"]],
  "activity:p1-i4": [["2286179eced86439", "2e2abaee3b384b17", "2b76e5d5010eab3c"], ["2286179eced86439", "d5c36a724919b86b", "fed67b6934bb7fa0"], ["2442e708c58cdbcd", "d5c36a724919b86b", "074bc1672712f2db"]],
  "activity:p1-i11": [["8761840d35fe8bc3", "bb875f14008826ff", "11c2d3defa119a3a"], ["8761840d35fe8bc3", "1797649e70e52d80", "3013140f0825f38f"], ["d38f95093b464f35", "1797649e70e52d80", "3013140f0825f38f"]],
  "activity:p2-i7": [["4785736328b7dcee", "48da943637cc347d", "f943e027e02443a1"], ["4785736328b7dcee", "535219f79b7fa9fb", "46ec723e0e5347c2"], ["49419f01cb59a2b8", "535219f79b7fa9fb", "46ec723e0e5347c2"]],
  "activity:p2-i8": [["82931d52b45e1022", "3b5500131570a6e3", "b7ca15e7a318107c"], ["82931d52b45e1022", "fd3357ef1acc1ae6", "fb5325b9fbffc7ec"], ["4259cbaa8f8f809f", "fd3357ef1acc1ae6", "fb5325b9fbffc7ec"]],
  "activity:p2-i10": [["5c796b6e76f7b23d", "b04b067f9a4eaa99", "b64961e8e8c737cf"], ["5c796b6e76f7b23d", "7d0506cd26f0baf2", "27d4cbeadbd75532"], ["9027c15b4b26a653", "7d0506cd26f0baf2", "27d4cbeadbd75532"]],
  "activity:p2-i12": [["f30c6d0ba4136228", "88d4d4983dda8707", "a356f1b5d7718a7d"], ["f30c6d0ba4136228", "2625d9170cf46920", "c1efeced6746f2dd"], ["86cf1ac8a8d2151c", "2625d9170cf46920", "c1efeced6746f2dd"]],
  "activity:p2-i3": [["45350da22acf9fba", "cc1dbc7007687e86", "e36d129de2e8338a"], ["45350da22acf9fba", "cea0d1c7a4129d6a", "e938987853f500e0"], ["4e4d3e9448c52b97", "cea0d1c7a4129d6a", "d54e98c8b0bde761"]],
  "activity:p3-i9": [["64344310e50d727a", "cd0ad2842d247403", "9363eb2a95928f56"], ["64344310e50d727a", "0f3740ef28e750e8", "33aacd2278320b37"], ["d454ffff8ba6190d", "0f3740ef28e750e8", "33aacd2278320b37"]],
  "activity:p3-i4": [["49067d3f02e4cadd", "2e2abaee3b384b17", "2002b6a863344372"], ["49067d3f02e4cadd", "ba26b143c2cee421", "1c515eb8cec314a8"], ["eb7331ada8ddf95f", "ba26b143c2cee421", "cbe672bbd2e767c2"]],
  "activity:p3-i8": [["07131ff056e2e76d", "3b5500131570a6e3", "91862bb17ab1faeb"], ["07131ff056e2e76d", "bc873471368b42f7", "e5576ce33a3e6df1"], ["1f232c623eb219a9", "bc873471368b42f7", "e5576ce33a3e6df1"]],
  "activity:p3-i5": [["7799d4464ec353fa", "5ddcd376e0a4fb15", "b9c17d90c2821e87"], ["7799d4464ec353fa", "a5b56c89598aac7d", "cec7366264390c8b"], ["02dd2fe67617b213", "a5b56c89598aac7d", "cec7366264390c8b"]],
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
