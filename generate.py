"""Rebuild the deterministic browser dataset. All values are synthetic."""
import json
import math
import random
from pathlib import Path

rng = random.Random(47)
markets = [
    ('North America','United States','AtlasBank NA','USD',1,4600),
    ('North America','Canada','AtlasBank Canada','CAD',.73,2600),
    ('Europe','United Kingdom','AtlasBank UK','GBP',1.29,2400),
    ('Europe','Germany','AtlasBank Europe','EUR',1.09,2200),
    ('Asia-Pacific','India','AtlasBank India','INR',.012,157000),
    ('Asia-Pacific','Singapore','AtlasBank Singapore','SGD',.75,2100),
]
products = ['Mortgage','SME Lending','Personal Lending']
rows = []
for i in range(24):
    month = f'{2024+i//12}-{1+i%12:02}'
    for j,(region,country,entity,ccy,base,size) in enumerate(markets):
        fx = base if j == 0 else base*(1+.035*math.sin(i/4+j)-.002*i)
        for k,product in enumerate(products):
            loan = size*[1,.64,.41][k]*(1+i*(.005+j*.001))*(1+rng.uniform(-.018,.018))
            deposits = loan*(1.19+.12*math.sin(j+k)-i*.002+rng.uniform(-.018,.018))
            nii = loan*(.028+.013*k+.003*j)/12
            fees = nii*(.29+.04*k)
            cost = (nii+fees)*(.47+.02*j+rng.uniform(-.035,.035))
            npl = loan*(.008+.006*k+.001*j+i*(.00004+.00007*(j==4 and k==2)))
            ecl = npl*(.024+.004*k)
            rows.append(dict(month=month,region=region,country=country,entity=entity,
                currency=ccy,product=product,fx=fx,loans=loan,deposits=deposits,
                nii=nii,fees=fees,cost=cost,ecl=ecl,budget=(nii+fees-cost-ecl)*(1+rng.uniform(-.12,.08)),
                npl=npl,dpd30=npl*(.75+.1*k),dpd60=npl*.42,
                matured=deposits*(.065+.008*j),liquid=deposits*(.18+.012*k),inflows=loan*.028,
                top20=deposits*(.12+.026*j+.013*k)))
Path(__file__).with_name('demo.js').write_text('window.ATLAS_DATA = '+json.dumps(rows,separators=(',',':'))+';\n')
