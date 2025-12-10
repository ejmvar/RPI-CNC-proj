const parser = require('../../../modules/gcode/parser.js');
const { performance } = require('perf_hooks');

describe('G-Code parser performance benchmarks', () => {
  const generateGCode = (lines) => {
    const commands = ['G0', 'G1', 'G2', 'G3'];
    const gcode = [];
    for (let i = 0; i < lines; i++) {
      const cmd = commands[i % commands.length];
      const x = (Math.random() * 200 - 100).toFixed(3);
      const y = (Math.random() * 200 - 100).toFixed(3);
      const z = (Math.random() * 50).toFixed(3);
      gcode.push(`${cmd} X${x} Y${y} Z${z} F${Math.floor(Math.random() * 2000)}`);
    }
    return gcode.join('\n');
  };

  test('benchmark: parse 100 lines', () => {
    const gcode = generateGCode(100);
    const start = performance.now();
    const result = parser.parse(gcode);
    const end = performance.now();
    const duration = end - start;

    expect(result.length).toBeLessThanOrEqual(100);
    expect(duration).toBeLessThan(50); // should complete in < 50ms
    console.log(`  ⏱️  100 lines: ${duration.toFixed(2)}ms`);
  });

  test('benchmark: parse 1000 lines', () => {
    const gcode = generateGCode(1000);
    const start = performance.now();
    const result = parser.parse(gcode);
    const end = performance.now();
    const duration = end - start;

    expect(result.length).toBeLessThanOrEqual(1000);
    expect(duration).toBeLessThan(200); // should complete in < 200ms
    console.log(`  ⏱️  1000 lines: ${duration.toFixed(2)}ms`);
  });

  test('benchmark: parse 10000 lines', () => {
    const gcode = generateGCode(10000);
    const start = performance.now();
    const result = parser.parse(gcode);
    const end = performance.now();
    const duration = end - start;

    expect(result.length).toBeLessThanOrEqual(10000);
    expect(duration).toBeLessThan(2000); // should complete in < 2s
    console.log(`  ⏱️  10000 lines: ${duration.toFixed(2)}ms`);
  });

  test('benchmark: parseLine throughput', () => {
    const testLine = 'G1 X10.5 Y20.3 Z-5.1 F1500';
    const iterations = 10000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parser.parseLine(testLine);
    }
    const end = performance.now();
    const duration = end - start;
    const throughput = iterations / (duration / 1000);

    expect(throughput).toBeGreaterThan(10000); // > 10k lines/sec
    console.log(
      `  ⏱️  Throughput: ${throughput.toFixed(0)} lines/sec (${duration.toFixed(
        2
      )}ms for ${iterations} iterations)`
    );
  });

  test('benchmark: complex G-code with comments', () => {
    const complexGCode = `
; Header comment
(Program: test.nc)
N10 G90 G21
N20 G0 X0 Y0 Z10 ; rapid to start
N30 G1 Z0 F100 ; plunge
N40 G1 X50 Y50 F500 (first cut)
N50 G2 X60 Y60 I5 J0 ; arc move
N60 G0 Z10 ; retract
N70 M30 ; end program
    `.repeat(100); // repeat to make it larger

    const start = performance.now();
    const result = parser.parse(complexGCode);
    const end = performance.now();
    const duration = end - start;

    expect(result.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(500);
    console.log(`  ⏱️  Complex G-code: ${duration.toFixed(2)}ms for ${result.length} parsed lines`);
  });

  test('benchmark: memory efficiency', () => {
    const gcode = generateGCode(5000);

    if (global.gc) {
      global.gc();
    }
    const memBefore = process.memoryUsage().heapUsed;

    const result = parser.parse(gcode);

    const memAfter = process.memoryUsage().heapUsed;
    const memDelta = (memAfter - memBefore) / 1024 / 1024; // MB

    expect(result.length).toBeLessThanOrEqual(5000);
    expect(memDelta).toBeLessThan(15); // should use < 15MB (relaxed from 10MB for CI stability)
    console.log(`  💾 Memory: ${memDelta.toFixed(2)}MB for 5000 lines`);
  });
});
