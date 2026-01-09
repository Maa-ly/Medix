.PHONY: build test fmt fmt-check deploy-lisk deploy-lisk-dry verify-lisk-impl verify-lisk-proxy encode-proxy-ctor

LISK_CHAIN_ID ?= 4202
LISK_RPC_URL ?= https://rpc.sepolia-api.lisk.com
LISK_VERIFIER_URL ?= https://sepolia-blockscout.lisk.com/api
BLOCKSCOUT_API_KEY ?=

-include .env

ifeq ($(strip $(BLOCKSCOUT_API_KEY)),)
VERIFY_API_KEY_FLAG :=
else
VERIFY_API_KEY_FLAG := --verifier-api-key $(BLOCKSCOUT_API_KEY)
endif

build:
	forge build --sizes

test:
	forge test -vvv

fmt:
	forge fmt

fmt-check:
	forge fmt --check

deploy-lisk-dry:
	forge script script/DeployLiskVeTerex.s.sol:DeployLiskVeTerex --rpc-url $(LISK_RPC_URL) --chain $(LISK_CHAIN_ID) -vvvv

deploy-lisk:
	forge script script/DeployLiskVeTerex.s.sol:DeployLiskVeTerex --rpc-url $(LISK_RPC_URL) --chain $(LISK_CHAIN_ID) --broadcast

verify-lisk-impl:
	forge verify-contract --rpc-url $(LISK_RPC_URL) --chain $(LISK_CHAIN_ID) --verifier blockscout --verifier-url $(LISK_VERIFIER_URL) $(VERIFY_API_KEY_FLAG) --num-of-optimizations 200 --compiler-version 0.8.30 --watch $(ADDRESS) src/trex.sol:VeTerex

encode-proxy-ctor:
	cast abi-encode "constructor(address,bytes)" $(IMPLEMENTATION_ADDRESS) $(INIT_DATA)

verify-lisk-proxy:
	forge verify-contract --rpc-url $(LISK_RPC_URL) --chain $(LISK_CHAIN_ID) --verifier blockscout --verifier-url $(LISK_VERIFIER_URL) $(VERIFY_API_KEY_FLAG) --num-of-optimizations 200 --compiler-version 0.8.30 --constructor-args $$(cast abi-encode "constructor(address,bytes)" $(IMPLEMENTATION_ADDRESS) $(INIT_DATA)) --watch $(PROXY_ADDRESS) lib/openzeppelin-contracts-upgradeable/lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
