import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import { LLMModel, LLMModelConfig } from "@/lib/model";
import "core-js/features/object/group-by.js";
import Image from "next/image";

export function LLMPicker({
  models,
  languageModel,
  onLanguageModelChange,
}: {
  models: LLMModel[];
  languageModel: LLMModelConfig;
  onLanguageModelChange: (config: LLMModelConfig) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <Select
          name="languageModel"
          defaultValue={languageModel.model}
          onValueChange={(e) => onLanguageModelChange({ model: e })}
        >
          <SelectTrigger className="whitespace-nowrap border shadow-sm focus:ring-2 px-2 py-1 h-8 text-sm">
            <SelectValue placeholder="Select a language model" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800">
            {Object.entries(
              Object.groupBy(models, ({ provider }) => provider)
            ).map(([provider, models]) => (
              <SelectGroup key={provider}>
                <SelectLabel>{provider}</SelectLabel>
                {models?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center space-x-2">
                      <Image
                        className="flex"
                        src={`/thirdparty/logos/${model.providerId}.svg`}
                        alt={`${model.provider} logo`}
                        width={16}
                        height={16}
                      />
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
