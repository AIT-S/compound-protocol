const {
  etherMantissa
} = require('./Utils/Ethereum');

const {
  makeCToken,
  makePriceOracle,
} = require('./Utils/Compound');

describe('PriceOracleProxy', () => {
  let root, accounts;
  let oracle, backingOracle, cEth, cUsdc, cDai, cUsdt, cYcrv, cYycrv, cYeth, cOther;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    cEth = await makeCToken({kind: "cether", comptrollerOpts: {kind: "v1-no-proxy"}, supportMarket: true});
    cUsdc = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cDai = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cUsdt = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cYcrv = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cYycrv = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cYeth = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});
    cOther = await makeCToken({comptroller: cEth.comptroller, supportMarket: true});

    backingOracle = await makePriceOracle();
    oracle = await deploy('PriceOracleProxy',
      [
        root,
        backingOracle._address,
        cEth._address,
        cUsdc._address,
        cUsdt._address,
        cYcrv._address,
        cYycrv._address,
        cYeth._address,
      ]
     );
  });

  describe("constructor", () => {
    it("sets address of admin", async () => {
      let configuredGuardian = await call(oracle, "admin");
      expect(configuredGuardian).toEqual(root);
    });

    it("sets address of v1 oracle", async () => {
      let configuredOracle = await call(oracle, "v1PriceOracle");
      expect(configuredOracle).toEqual(backingOracle._address);
    });

    it("sets address of cEth", async () => {
      let configuredCEther = await call(oracle, "cEthAddress");
      expect(configuredCEther).toEqual(cEth._address);
    });

    it("sets address of cUSDC", async () => {
      let configuredCUSD = await call(oracle, "cUsdcAddress");
      expect(configuredCUSD).toEqual(cUsdc._address);
    });

    it("sets address of cUSDT", async () => {
      let configuredCUSDT = await call(oracle, "cUsdtAddress");
      expect(configuredCUSDT).toEqual(cUsdt._address);
    });

    it("sets address of cYcrv", async () => {
      let configuredCYCRV = await call(oracle, "cYcrvAddress");
      expect(configuredCYCRV).toEqual(cYcrv._address);
    });

    it("sets address of cYycrv", async () => {
      let configuredCYYCRV = await call(oracle, "cYYcrvAddress");
      expect(configuredCYYCRV).toEqual(cYycrv._address);
    });

    it("sets address of cYeth", async () => {
      let configuredCYETH = await call(oracle, "cYethAddress");
      expect(configuredCYETH).toEqual(cYeth._address);
    });
  });

  describe("getUnderlyingPrice", () => {
    let setAndVerifyBackingPrice = async (cToken, price) => {
      await send(
        backingOracle,
        "setUnderlyingPrice",
        [cToken._address, etherMantissa(price)]);

      let backingOraclePrice = await call(
        backingOracle,
        "assetPrices",
        [cToken.underlying._address]);

      expect(Number(backingOraclePrice)).toEqual(price * 1e18);
    };

    let readAndVerifyProxyPrice = async (token, price) =>{
      let proxyPrice = await call(oracle, "getUnderlyingPrice", [token._address]);
      expect(Number(proxyPrice)).toEqual(price * 1e18);
    };

    it("always returns 1e18 for cEth", async () => {
      await readAndVerifyProxyPrice(cEth, 1);
    });

    it("proxies for whitelisted tokens", async () => {
      await setAndVerifyBackingPrice(cOther, 11);
      await readAndVerifyProxyPrice(cOther, 11);

      await setAndVerifyBackingPrice(cOther, 37);
      await readAndVerifyProxyPrice(cOther, 37);
    });

    it("returns 0 for token without a price", async () => {
      let unlistedToken = await makeCToken({comptroller: cEth.comptroller});

      await readAndVerifyProxyPrice(unlistedToken, 0);
    });
  });
});
