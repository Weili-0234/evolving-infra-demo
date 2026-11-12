window.SUMMARY_DATA = {
 "generated": "tools/summary-bars-20261112/build-summary-data.py",
 "sources": {
  "data.json": "8c4f1c7f719ccf26b281e9167f9ca6bfc386890e578964d938119e97670adeea",
  "fleet-data.js": "c5a242d5d39a21392297c20d9699a8cb0bf1f3e8fd778ef3f5d0beef238e3c65",
  "cua-latency.json": "9d6d6db705039a3a9f3eeb025a5a1e754147163d202658316f679adb23f966d4"
 },
 "workloads": {
  "cua": {
   "label": "Computer-use agents",
   "model": "Kimi K2.6",
   "agents": 128,
   "windowStartSeconds": 1800,
   "windowSeconds": 3300,
   "arms": {
    "dyn": {
     "e2eMean": 55.72833952643806,
     "ttftP95": 135.44278568485018,
     "n": 6652,
     "ttftN": 6652,
     "calls": 6652,
     "callsPerMinute": 120.94545454545455,
     "revenue": 95.92198695,
     "userCostPerMillionTokens": 0.22210908718346475
    },
    "ours": {
     "e2eMean": 24.525871723735758,
     "ttftP95": 35.3440258328996,
     "n": 14199,
     "ttftN": 14199,
     "calls": 14199,
     "callsPerMinute": 258.1636363636364,
     "revenue": 204.7979761,
     "userCostPerMillionTokens": 0.21512917954734284
    }
   }
  },
  "cc": {
   "label": "Coding agents",
   "model": "GLM-5.2",
   "agents": 126,
   "windowStartSeconds": 1800,
   "windowSeconds": 3600,
   "arms": {
    "dyn": {
     "e2eMean": 54.38,
     "ttftP95": 228.37,
     "n": 7710,
     "ttftN": 7710,
     "calls": 7710,
     "callsPerMinute": 128.5,
     "revenue": 459.72430776,
     "userCostPerMillionTokens": 0.3952076735097134
    },
    "ours": {
     "e2eMean": 13.04,
     "ttftP95": 19.57,
     "n": 21302,
     "ttftN": 21302,
     "calls": 21302,
     "callsPerMinute": 355.03333333333336,
     "revenue": 1082.76857768,
     "userCostPerMillionTokens": 0.33120145766493164
    }
   }
  }
 }
};
