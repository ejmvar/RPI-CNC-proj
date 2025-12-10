const { createMockGRBL } = require('../../../modules/backend/firmware/mock-grbl');

describe('Mock GRBL firmware interface', () => {
  let grbl;

  beforeEach(() => {
    grbl = createMockGRBL({ responseDelay: 1 });
  });

  test('initializes in Idle state at origin', () => {
    const state = grbl.getState();
    expect(state.state).toBe('Idle');
    expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('responds to status query (?)', (done) => {
    grbl.on('data', (data) => {
      expect(data).toMatch(/<Idle\|MPos:0.000,0.000,0.000/);
      done();
    });
    grbl.send('?');
  });

  test('processes movement commands (G0/G1)', (done) => {
    grbl.on('data', (data) => {
      if (data === 'ok\n') {
        const pos = grbl.getPosition();
        expect(pos.x).toBe(10);
        expect(pos.y).toBe(20);
        expect(pos.z).toBe(5);
        done();
      }
    });
    grbl.send('G1 X10 Y20 Z5 F500');
  });

  test('handles homing cycle ($H)', (done) => {
    grbl.position = { x: 50, y: 30, z: 10 };
    let stateChanges = 0;

    grbl.on('stateChange', (state) => {
      stateChanges++;
      if (state.state === 'Idle' && stateChanges > 1) {
        expect(grbl.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
        done();
      }
    });

    grbl.send('$H');
  });

  test('handles feed hold (!)', (done) => {
    grbl.on('stateChange', (state) => {
      if (state.state === 'Hold') {
        expect(grbl.getState().state).toBe('Hold');
        done();
      }
    });
    grbl.send('!');
  });

  test('handles resume (~)', (done) => {
    grbl.state = 'Hold';
    grbl.on('stateChange', (state) => {
      if (state.state === 'Run') {
        done();
      }
    });
    grbl.send('~');
  });

  test('responds to settings query ($$)', (done) => {
    const responses = [];
    grbl.on('data', (data) => {
      responses.push(data);
      if (data === 'ok\n') {
        expect(responses.some((r) => r.includes('$100='))).toBe(true);
        done();
      }
    });
    grbl.send('$$');
  });

  test('updates modal state (G90/G91)', (done) => {
    grbl.send('G91');
    setTimeout(() => {
      expect(grbl.getState().mode).toBe('G91');
      done();
    }, 10);
  });

  test('updates units (G20/G21)', (done) => {
    grbl.send('G20');
    setTimeout(() => {
      expect(grbl.getState().units).toBe('G20');
      done();
    }, 10);
  });

  test('emits spindle state changes (M3/M5)', (done) => {
    grbl.on('stateChange', (state) => {
      if (state.spindle === 'on') {
        done();
      }
    });
    grbl.send('M3 S1000');
  });

  test('processes multiple commands in sequence', (done) => {
    const commands = ['G0 X10 Y10', 'G1 Z-5 F200', 'G0 Z10'];
    let commandsProcessed = 0;

    grbl.on('data', (data) => {
      if (data === 'ok\n') {
        commandsProcessed++;
        if (commandsProcessed === commands.length) {
          const pos = grbl.getPosition();
          expect(pos.x).toBe(10);
          expect(pos.y).toBe(10);
          expect(pos.z).toBe(10);
          done();
        }
      }
    });

    commands.forEach((cmd) => grbl.send(cmd));
  });

  test('reset clears state and position', () => {
    grbl.position = { x: 100, y: 50, z: 25 };
    grbl.state = 'Run';
    grbl.reset();

    const state = grbl.getState();
    expect(state.state).toBe('Idle');
    expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
  });
});
