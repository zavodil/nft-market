import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount } from '../state/near';
import { 
	contractId,
	isAccountTaken,
	networkId,
} from '../utils/near-utils';

const {
	KeyPair,
} = nearAPI;

export const Contract = ({ near, update, account }) => {
	if (!account) return <p>Please connect your NEAR Wallet</p>;

	const [media, setMedia] = useState([]);
	const [validMedia, setValidMedia] = useState('');
	const [royalties, setRoyalties] = useState({});
	const [royalty, setRoyalty] = useState([]);
	const [receiver, setReceiver] = useState([]);


	useEffect(() => {
		const canvas = document.querySelector('#canvas')
		const ctx = canvas.getContext('2d')

		const { accountId } = account
		const len = accountId.length
		const max = len * 255
		const encoded = new Uint8Array(new TextEncoder().encode(accountId))
		
		const r1 = encoded.subarray(0, Math.floor(len/2)).reduce((a, c) => a + c, 0) / (max / 2)
		const r2 = encoded.subarray(Math.floor(len/2) + 1, len).reduce((a, c) => a + c, 0) / (max / 2)

		console.log(r1, r2)
		setMedia([r1, r2])
		// const seed1 = encoded

		const arr = []
		
		const line = (x, y, x2, y2) => {
			ctx.beginPath()
			ctx.moveTo(x, y);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
		function draw() {
			ctx.fillStyle = 'PEACHPUFF';
			ctx.strokeStyle = 'black';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			const step = 30

			for (var x = 0; x < 400; x = x + step) {
				for (var y = 0; y < 400; y = y + step) {

					ctx.lineWidth = r2 * Math.abs(Math.sin(r1 * x + r1 * y)) * 20

					if(r1 * Math.abs(Math.sin(x + y) + Math.cos(r1 * x + r2 * y)) * 2 > 0.5) {
						line(x,y,x+step,y+step);
						
					} else {
						line(x+step,y,x,y+step);	
					}
				}
			}
		}

		draw()
	}, [])

	const handleMint = async () => {

		// shape royalties data for minting and check max is < 20%
		let perpetual_royalties = Object.entries(royalties).map(([receiver, royalty]) => ({
			[receiver]: royalty * 100
		})).reduce((acc, cur) => Object.assign(acc, cur), {});
		if (Object.values(perpetual_royalties).reduce((a, c) => a + c, 0) > 2000) {
			return alert('Cannot add more than 20% in perpetual NFT royalties when minting');
		}
		
		update('loading', true);
		const metadata = { 
			media: 'avatar:' + media.toString(),
			issued_at: Date.now().toString()
		};

		const deposit = parseNearAmount('0.1');
		await account.functionCall(contractId, 'nft_mint', {
			token_id: 'token-' + Date.now(),
			metadata,
			perpetual_royalties
		}, GAS, deposit);
		checkFreebies();
		update('loading', false);
		setMetadata('');
	};

	return <>
		<h4>Mint Your Unique AccountId Avatar</h4>

		<canvas id="canvas" width="400" height="400"></canvas>
		
		<h4>Royalties</h4>
		{
			Object.keys(royalties).length > 0 ? 
				Object.entries(royalties).map(([receiver, royalty]) => <div key={receiver}>
					{receiver} - {royalty} % <button onClick={() => {
						delete royalties[receiver];
						setRoyalties(Object.assign({}, royalties));
					}}>❌</button>
				</div>)
				:
				<p>No royalties added yet.</p>
		}
		<input className="full-width" placeholder="Account ID" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
		<input type="number" className="full-width" placeholder="Percentage" value={royalty} onChange={(e) => setRoyalty(e.target.value)} />
		<button onClick={async () => {
			const exists = await isAccountTaken(receiver);
			if (!exists) return alert(`Account: ${receiver} does not exist on ${networkId ==='default' ? 'testnet' : 'mainnet'}.`);
			setRoyalties(Object.assign({}, royalties, {
				[receiver]: royalty
			}));
		}}>Add Royalty</button>

		<div className="line"></div>

		<button onClick={() => handleMint()}>Mint</button>
	</>;
};

