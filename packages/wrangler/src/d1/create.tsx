import { Box, Text } from "ink";
import React from "react";
import { fetchResult } from "../cfetch";
import { logger } from "../logger";
import { requireAuth } from "../user";
import { renderToString } from "../utils/render";
import { d1BetaWarning } from "./utils";
import type {
	CommonYargsArgv,
	StrictYargsOptionsToInterface,
} from "../yargs-types";
import type { DatabaseCreation } from "./types";

export function Options(yargs: CommonYargsArgv) {
	return yargs
		.positional("name", {
			describe: "The name of the new DB",
			type: "string",
			demandOption: true,
		})
		.option("primary-location-hint", {
			describe: "A hint for the location of the D1 Primary",
			type: "string",
		})
		.epilogue(d1BetaWarning);
}

export async function Handler({
	name,
	primaryLocationHint,
}: StrictYargsOptionsToInterface<typeof Options>): Promise<void> {
	const accountId = await requireAuth({});

	logger.log(d1BetaWarning);

	let db: DatabaseCreation;
	try {
		db = await fetchResult(`/accounts/${accountId}/d1/database`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name,
				primary_location_hint: primaryLocationHint,
			}),
		});
	} catch (e) {
		if ((e as { code: number }).code === 7502) {
			throw new Error("A database with that name already exists");
		}
		throw e;
	}

	logger.log(
		renderToString(
			<Box flexDirection="column">
				{db.created_in_colo ? (
					<>
						<Text>
							✅ Created <Text color="yellow">{db.name}</Text>
							<Text dimColor> ({db.uuid})</Text>
							<Text>
								{" "}
								with Primary in <Text color="yellow">{db.created_in_colo}</Text>
								{db.primary_location_hint ? (
									<Text dimColor>
										{" "}(requested <Text bold>{db.primary_location_hint})</Text>
									</Text>
								) : null}
								.
							</Text>
						</Text>
						<Text>
							Prefer a different location? Delete this DB then use the{" "}
							<Text bold>--primary-location-hint</Text> argument. See docs: ...
						</Text>
					</>
				) : (
					<>
						<Text>✅ Successfully created DB &apos;{db.name}&apos;!</Text>
					</>
				)}
				<Text>&nbsp;</Text>
				<Text>
					Add the following to your wrangler.toml to connect to it from a
					Worker:
				</Text>
				<Text>&nbsp;</Text>
				<Text color="gray">[[ d1_databases ]]</Text>
				<Text color="gray">
					binding = &quot;DB&quot; # i.e. available in your Worker on env.DB
				</Text>
				<Text color="gray">database_name = &quot;{db.name}&quot;</Text>
				<Text color="gray">database_id = &quot;{db.uuid}&quot;</Text>
			</Box>
		)
	);
}
