import GenericStrategy from './GenericStrategy'
import getMarketStats from 'market-rental-stats'
import axios from 'axios'
import BN from 'bn.js'
import { config } from 'dotenv'
config()


import {TriggerRental, SpotRent} from "../constants";

class ManualRentStrategy extends GenericStrategy {
	constructor(settings){
		super(settings);

		this.type = SpotRent
		this.self = this

		if (this.emitter)
			this.startup()
	}

	static getType(){
		return SpotRent
	}

	startup(){
		this.emitter.on(SpotRent, this.checkProfitability)
	}
	async calculateSpotProfitability() {
		//ToDo: Standardize env var names
		if (!process.env.API_KEY || !process.env.API_SECRET || !process.env.NICEHASH_API_KEY || !process.env.NICEHASH_API_ID)
			throw new Error('Must provide MRR and NiceHash API_KEYS')
		let mrrAPIkeys = {
			key: process.env.API_KEY,
			secret: process.env.API_SECRET
		}

		let nhAPIkeys = {
			key: process.env.NICEHASH_API_KEY,
			id: process.env.NICEHASH_API_ID
		}

		let weightedRentalCosts = await getMarketStats(mrrAPIkeys, nhAPIkeys)
		let usdBTC = (await axios.get("https://bittrex.com/api/v1.1/public/getticker?market=usd-btc")).data
		let btcFLO = (await axios.get("https://bittrex.com/api/v1.1/public/getticker?market=btc-flo")).data
		usdBTC = usdBTC.result.Last
		btcFLO = btcFLO.result.Last
		let floPriceUSD = usdBTC * btcFLO

		const time = 3 // time can be lowered or should be calculated
		const PWTh1 = 0.3
		const FLOperBlock = 12.5
		const TargetBlockTime = 40

		//this.chain.getTarget(Date.now(), this.chain.tip)
		// get the following
		let NextDiff = 0
		let NetHashrate = (NextDiff * Math.pow(2, 32)) / TargetBlockTime
		let WeightedAverageRentalCost = weights.weighted
		let FLOPrice = floPriceUSD
		// -----------------

		let cost = NetHashrate * WeightedAverageRentalCost * time * PWTh1
		let ret = FLOperBlock * TargetBlockTime / (60*60) * time * FLOPrice * PWTh1

		let profit = -cost + ret
		let margin = profit / ret

		let spotProfitCheck = -(NetHashrate * WeightedAverageRentalCost * time * PWTh1) + ((FLOperBlock) * (TargetBlockTime) / (60 * 60) * time * PWTh1) * FLOPrice

		let CurrentPoolHashrate = 0
		let amount = ((NextDiff * Math.pow(2, 32)) / (TargetBlockTime / PWTh1)) - CurrentPoolHashrate

		return {
			isProfitable: spotProfitCheck > 0,
			amount
		}
	}
	async checkProfitability() {
		let spotProfit = await this.calculateSpotProfitability()
		let isProfitable = spotProfit > 0
		if (isProfitable) {
			console.log('trigger rental')
			// this.emitter.emit(TriggerRental, hashrate, duration, rentSelector)
		} else {
			setTimeout(this.checkProfitability(), 1000 * 40)
		}
	}

}

export default ManualRentStrategy