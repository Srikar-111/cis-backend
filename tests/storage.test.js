describe('Storage Provisioning Requirements', () => {

  const req = {
    size: parseInt(process.env.TEST_PARAM_SIZE || '0'),
    type: process.env.TEST_PARAM_TYPE || 'Unknown'
  };

  it('must allocate more than 0 GB of size', () => {
    expect(req.size).toBeGreaterThan(0);
  });

  it('must specify a valid storage type (SSD, HDD, NVMe)', () => {
    const valid = ['SSD', 'HDD', 'NVMe'].includes(req.type);
    expect(valid).toBe(true);
  });
});
