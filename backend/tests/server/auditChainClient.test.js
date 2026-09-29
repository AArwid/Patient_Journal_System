const auditChainClient = require("../../src/server/services/auditChainClient");

describe("auditChainClient", () => {
  it("appends each event to the shared blockchain in order", async () => {
    const first = await auditChainClient.recordEvent({
      type: "journal.accessed",
      patientId: 101,
    });
    const second = await auditChainClient.recordEvent({
      type: "journal.accessed",
      patientId: 102,
    });
    const blockchain = await auditChainClient.getBlockchain();

    expect(first.index).toBeGreaterThan(0);
    expect(second.index).toBe(first.index + 1);
    expect(second.previousHash).toBe(first.hash);
    expect(blockchain.validateChain()).toBe(true);
  });
});
