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

	const [drawing, setDrawing] = useState([]);
	const [media, setMedia] = useState('');
	const [validMedia, setValidMedia] = useState('');
	const [royalties, setRoyalties] = useState({});
	const [royalty, setRoyalty] = useState([]);
	const [receiver, setReceiver] = useState([]);

	useEffect(() => {
		// drawing all happens here
		const canvas = document.querySelector('#canvas')
		const ctx = canvas.getContext("2d");

		const offsetY = -canvas.getBoundingClientRect().y
		const offsetX = -canvas.getBoundingClientRect().x
		let arr = []
		let d, x, y, px, py
		let isMouseDown = false

		window.clearDrawing = () => arr = []
		window.onmousedown = (e) => {
			x = px = Math.floor(offsetX + e.clientX)
			y = py = Math.floor(offsetY + e.clientY)
			if (x < 0 || x > 400 || y < 0 || y > 400) return
			isMouseDown = true
			arr.push([x, y])
			ctx.beginPath();
			ctx.moveTo(x, y);
		}
		window.onmouseup = (e) => {
			isMouseDown = false
			arr.push([-1, -1])
			setDrawing(drawing.concat(arr))
		}
		window.onmousemove = (e) => {
			if (!isMouseDown) return
			x = Math.floor(offsetX + e.clientX)
			y = Math.floor(offsetY + e.clientY)
			d = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2))
			if (d > 20) {
				px = x
				py = y
				arr.push([x, y])
				ctx.lineTo(x, y);
				ctx.stroke();
			}
		}
		return () => {
			window.onmousemove = window.onmouseup = window.onmousedown = null
		}
		
	}, [])

	const handleClear = () => {
		const canvas = document.querySelector('#canvas')
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setDrawing([])
		window.clearDrawing()
	}

	const handleMint = async () => {
		if (!drawing.length) {
			alert('Please draw something above');
			return;
		}

		// shape royalties data for minting and check max is < 20%
		let perpetual_royalties = Object.entries(royalties).map(([receiver, royalty]) => ({
			[receiver]: royalty * 100
		})).reduce((acc, cur) => Object.assign(acc, cur), {});
		if (Object.values(perpetual_royalties).reduce((a, c) => a + c, 0) > 2000) {
			return alert('Cannot add more than 20% in perpetual NFT royalties when minting');
		}
		
		update('loading', true);
		const metadata = { 
			media: 'drawing:' + drawing.toString(),
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
		<h4>Draw Something</h4>

		<canvas id="canvas" width="400" height="400"></canvas>
		
		<button onClick={() => handleClear()}>Clear</button>
		
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

