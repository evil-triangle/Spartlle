# -*- coding: utf-8 -*-
import os
base = os.path.dirname(os.path.abspath(__file__))
for n in ['_patch_12.py', '_patch_out.txt', '_smoke.txt', '_t12.txt', '_t12b.txt',
          '_layout12.txt', '_out.txt', '1-2.html.bak']:
    p = os.path.join(base, n)
    if os.path.exists(p):
        os.remove(p)
        print('removed', n)
