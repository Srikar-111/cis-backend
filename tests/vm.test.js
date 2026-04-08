describe('VM Provisioning Requirements', () => {

  const req = {
    cores: parseInt(process.env.TEST_PARAM_CORES || '0'),
    ram: parseInt(process.env.TEST_PARAM_RAM || '0'),
    os: process.env.TEST_PARAM_OS || 'Unknown'
  };

  it('must have minimum 1 CPU core', () => {
    expect(req.cores).toBeGreaterThanOrEqual(1);
  });

  it('must have minimum 1GB RAM', () => {
    expect(req.ram).toBeGreaterThanOrEqual(1);
  });

  it('must specify an OS', () => {
    expect(req.os.length).toBeGreaterThan(2);
  });
});
