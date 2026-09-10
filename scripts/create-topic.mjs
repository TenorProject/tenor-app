import {
  Client,
  TopicCreateTransaction,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

const operatorId = "0.0.10455448";
const operatorKey = "0xd7c5ace86509854200e792636b39f83cc7ec2deadfeaccea714ef9c6d79107d7";

const client = Client.forTestnet();
client.setOperator(
  AccountId.fromString(operatorId),
  PrivateKey.fromStringECDSA(operatorKey),
);

const tx = new TopicCreateTransaction().setTopicMemo("Tenor Audit Trail");
const response = await tx.execute(client);
const receipt = await response.getReceipt(client);

console.log("Topic created:", receipt.topicId.toString());
console.log("\nSet this in Railway:");
console.log(`NEXT_PUBLIC_HCS_TOPIC_ID="${receipt.topicId.toString()}"`);

client.close();
