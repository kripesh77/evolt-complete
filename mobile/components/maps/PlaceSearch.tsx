import React, { useState, useCallback } from "react";
import { ActivityIndicator, FlatList, Keyboard } from "react-native";
import {
  Container,
  SearchInput,
  LoaderWrapper,
  ResultsContainer,
  ResultItem,
  ResultText,
} from "./PlaceSearch.styles";
import { usePlaceSearch } from "../../hooks/useApi";
import type { NominatimResult } from "../../types";

interface PlaceSearchProps {
  onSelectPlace: (place: NominatimResult) => void;
}

export function PlaceSearch({ onSelectPlace }: PlaceSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Use React Query for place search
  const { data: searchResults, isLoading: isSearching } = usePlaceSearch(
    debouncedQuery,
    debouncedQuery.length >= 3,
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);

      // Clear previous timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounced query after delay
      const timer = setTimeout(() => {
        setDebouncedQuery(text);
      }, 500);

      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const handleSelectPlace = (place: NominatimResult) => {
    onSelectPlace(place);
    setSearchQuery(place.display_name.split(",")[0] || "");
    setDebouncedQuery(""); // Clear debounced query to hide results
    Keyboard.dismiss();
  };

  const results = searchResults ?? [];

  return (
    <>
      <Container>
        <SearchInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search for a place..."
          placeholderTextColor="#999"
        />
        {isSearching && (
          <LoaderWrapper>
            <ActivityIndicator size="small" color="#4CAF50" />
          </LoaderWrapper>
        )}
      </Container>

      {results.length > 0 && debouncedQuery.length >= 3 && (
        <ResultsContainer>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <ResultItem onPress={() => handleSelectPlace(item)}>
                <ResultText numberOfLines={2}>{item.display_name}</ResultText>
              </ResultItem>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </ResultsContainer>
      )}
    </>
  );
}
