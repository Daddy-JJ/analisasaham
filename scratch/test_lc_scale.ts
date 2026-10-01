async function test() {
  const lc = await import('lightweight-charts');
  console.log('LC exports:', Object.keys(lc).filter(k => k.includes('Series') || k.includes('Scale') || k.includes('Range')));
}
test();
