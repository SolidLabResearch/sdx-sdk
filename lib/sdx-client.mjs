import "./chunk-G42LTC7K.mjs";
import { LegacySdxClient } from "./legacy-sdx-client.js";
class SdxClient {
  constructor() {
    this.legacyClient = new LegacySdxClient("http://localhost:3000/complex.ttl");
  }
  async query(query, documentLocation) {
    return this.legacyClient.query(query, documentLocation);
  }
  async mutation(mutation) {
    throw new Error("Method not implemented.");
  }
}
export {
  SdxClient
};
