from PIL import Image
import colorsys, math, json, sys

SHOTS = {
    "01-boot":     r"D:/Projects/Brawler/tests/e2e/shots/01-boot.png",
    "02-combat":   r"D:/Projects/Brawler/tests/e2e/shots/02-combat.png",
    "03-inventory":r"D:/Projects/Brawler/tests/e2e/shots/03-inventory.png",
    "04-map":      r"D:/Projects/Brawler/tests/e2e/shots/04-map.png",
}

# Locked palette (ARCHITECTURE.md)
PALETTE = {
    "Ash":      (0xD9,0xD2,0xC5),
    "Bone":     (0xEF,0xE9,0xDC),
    "Slate":    (0x3B,0x41,0x49),
    "Peat":     (0x4A,0x3F,0x35),
    "Moss":     (0x6E,0x7A,0x54),
    "Rust":     (0xA6,0x55,0x2F),
    "Oxblood":  (0x6E,0x2A,0x28),
    "Palegold": (0xC9,0xA2,0x27),
}

def hsv_of(r,g,b):
    return colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)

def analyze(name, path):
    im = Image.open(path).convert("RGB")
    w,h = im.size
    px = im.getdata()
    n = w*h
    lum_sum = 0.0
    uniq = set()
    neon = 0
    pal_hits = {k:0 for k in PALETTE}
    sat_hist = [0]*11  # 0.0-1.0 in 0.1 buckets
    hue_neon = {"cyan":0,"magenta":0,"purple":0}
    # dominant color accumulation (coarse 5-bit quant)
    dom = {}
    for (r,g,b) in px:
        # luminance (rec709)
        lum = 0.2126*r + 0.7152*g + 0.0722*b
        lum_sum += lum
        uniq.add((r//8, g//8, b//8))
        hh,ss,vv = hsv_of(r,g,b)
        # saturation bucket
        sb = min(10, int(ss*10))
        sat_hist[sb]+=1
        # neon / banned hue bands (high saturation + value)
        if ss > 0.75 and vv > 0.45:
            hue_deg = hh*360
            # cyan ~ 165-200, magenta ~ 290-330, purple ~ 240-290
            if 160 <= hue_deg <= 200:
                hue_neon["cyan"]+=1; neon+=1
            elif 285 <= hue_deg <= 330:
                hue_neon["magenta"]+=1; neon+=1
            elif 235 <= hue_deg <= 290:
                hue_neon["purple"]+=1; neon+=1
        # palette proximity (euclid < 42)
        for k,(pr,pg,pb) in PALETTE.items():
            d = math.sqrt((r-pr)**2+(g-pg)**2+(b-pb)**2)
            if d < 42:
                pal_hits[k]+=1
        key=(r//16,g//16,b//16)
        dom[key]=dom.get(key,0)+1
    mean_lum = lum_sum/n/255.0
    uniq_count = len(uniq)
    top = sorted(dom.items(), key=lambda x:-x[1])[:8]
    def rgb(k): return (k[0]*16, k[1]*16, k[2]*16)
    top_cols = [(rgb(k), c, round(100*c/n,2)) for k,c in top]
    report = {
        "size": [w,h],
        "mean_luminance": round(mean_lum,3),
        "unique_colors_q8": uniq_count,
        "neon_pixels": neon,
        "neon_pct": round(100*neon/n,3),
        "neon_breakdown": hue_neon,
        "palette_hits_pct": {k: round(100*v/n,2) for k,v in pal_hits.items()},
        "saturation_high_pct(>0.75)": round(100*sum(sat_hist[8:])/n,2),
        "top_colors": top_cols,
    }
    return report

out = {}
for name,path in SHOTS.items():
    out[name] = analyze(name,path)
    r = out[name]
    print(f"\n===== {name} ({r['size'][0]}x{r['size'][1]}) =====")
    print(f"  meanLuminance : {r['mean_luminance']}")
    print(f"  uniqueColors  : {r['unique_colors_q8']}")
    print(f"  neonPixels    : {r['neon_pixels']} ({r['neon_pct']}%)  breakdown={r['neon_breakdown']}")
    print(f"  sat>0.75 %    : {r['saturation_high_pct(>0.75)']}")
    print(f"  palette hits% : {r['palette_hits_pct']}")
    print(f"  top colors (rgb,count,%):")
    for c,cnt,pct in r["top_colors"]:
        print(f"      {c}  {pct}%")

with open("critic_metrics.json","w") as f:
    json.dump(out,f,indent=2)
print("\n[written tmp/critic_metrics.json]")
