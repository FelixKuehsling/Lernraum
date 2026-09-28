import json,sys,difflib
a=json.load(open(sys.argv[1]));b=json.load(open(sys.argv[2]))
same=True
for k in sorted(set(a)|set(b)):
  if k=='views':
    for v in sorted(set(a[k])|set(b[k])):
      if a[k].get(v)!=b[k].get(v):
        same=False; print('VIEW DIFF',v)
        for l in difflib.ndiff([a[k].get(v,'')],[b[k].get(v,'')]):
          if l[0] in '?': print('  ',l[:300])
        sm=difflib.SequenceMatcher(None,a[k].get(v,''),b[k].get(v,''))
        for op,i1,i2,j1,j2 in sm.get_opcodes():
          if op!='equal': print('   ',op,repr(a[k][v][max(0,i1-30):i2+30]),'=>',repr(b[k][v][max(0,j1-30):j2+30]))
  elif a.get(k)!=b.get(k): same=False; print('DIFF',k,str(a.get(k))[:200],'=>',str(b.get(k))[:200])
print('IDENTICAL' if same else 'DIFFERENT')
